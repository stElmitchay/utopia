/**
 * User Registration API
 *
 * POST /api/user/register
 * Body: { walletAddress: string, email?: string }
 *
 * Creates:
 * 1. User profile in Supabase
 * 2. Monime financial account
 * 3. Links them together
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMonimeClient } from '@/lib/monime'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { walletAddress, email } = body

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, monime_financial_account_id')
      .eq('wallet_address', walletAddress)
      .single()

    if (existingUser) {
      // User exists, check if they have a Monime account
      if (existingUser.monime_financial_account_id) {
        return NextResponse.json({
          success: true,
          message: 'User already registered',
          userId: existingUser.id,
          monimeAccountId: existingUser.monime_financial_account_id,
          isNew: false
        })
      }

      // User exists but no Monime account - create one
      try {
        const monime = getMonimeClient()
        const monimeAccount = await monime.createFinancialAccount({
          name: `Utopia User ${walletAddress.slice(0, 8)}`,
          currency: 'SLE',
          metadata: {
            utopia_user_id: existingUser.id,
            wallet_address: walletAddress,
            platform: 'utopia'
          }
        })

        // Update user with Monime account ID
        await supabase
          .from('user_profiles')
          .update({
            monime_financial_account_id: monimeAccount.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)

        return NextResponse.json({
          success: true,
          message: 'Monime account created for existing user',
          userId: existingUser.id,
          monimeAccountId: monimeAccount.id,
          isNew: false
        })
      } catch (monimeError: any) {
        console.error('Failed to create Monime account:', monimeError)
        return NextResponse.json({
          success: true,
          message: 'User exists but Monime account creation failed',
          userId: existingUser.id,
          monimeAccountId: null,
          isNew: false,
          warning: monimeError.message
        })
      }
    }

    // Create new user profile
    const { data: newUser, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        wallet_address: walletAddress,
        email: email || null,
        credit_balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (insertError || !newUser) {
      console.error('Failed to create user profile:', insertError)
      return NextResponse.json(
        { error: 'Failed to create user profile', details: insertError?.message },
        { status: 500 }
      )
    }

    // Create Monime financial account
    let monimeAccountId: string | null = null
    try {
      const monime = getMonimeClient()
      const monimeAccount = await monime.createFinancialAccount({
        name: `Utopia User ${walletAddress.slice(0, 8)}`,
        currency: 'SLE',
        metadata: {
          utopia_user_id: newUser.id,
          wallet_address: walletAddress,
          platform: 'utopia'
        }
      })

      monimeAccountId = monimeAccount.id

      // Update user with Monime account ID
      await supabase
        .from('user_profiles')
        .update({
          monime_financial_account_id: monimeAccountId,
          updated_at: new Date().toISOString()
        })
        .eq('id', newUser.id)

    } catch (monimeError: any) {
      console.error('Failed to create Monime account for new user:', monimeError)
      // Don't fail the whole registration - user can still use the platform
      // Monime account can be created later via migration
    }

    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      userId: newUser.id,
      monimeAccountId,
      isNew: true
    })

  } catch (error: any) {
    console.error('Error in user registration:', error)
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    )
  }
}

// GET endpoint to check if user exists
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url)
    const walletAddress = searchParams.get('wallet')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    const { data: user } = await supabase
      .from('user_profiles')
      .select('id, wallet_address, monime_financial_account_id, credit_balance, created_at')
      .eq('wallet_address', walletAddress)
      .single()

    if (!user) {
      return NextResponse.json({
        exists: false,
        user: null
      })
    }

    return NextResponse.json({
      exists: true,
      user: {
        id: user.id,
        walletAddress: user.wallet_address,
        hasMonimeAccount: !!user.monime_financial_account_id,
        creditBalance: user.credit_balance || 0,
        createdAt: user.created_at
      }
    })

  } catch (error: any) {
    console.error('Error checking user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check user' },
      { status: 500 }
    )
  }
}
