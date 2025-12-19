/**
 * Create Monime Financial Account (Independent Operation)
 *
 * POST /api/user/create-monime-account
 * Body: { walletAddress: string, email?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMonimeClient } from '@/lib/monime'

export const dynamic = 'force-dynamic'

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

    // Check if user already has a Monime account
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, monime_financial_account_id')
      .eq('wallet_address', walletAddress)
      .single()

    if (existingUser?.monime_financial_account_id) {
      return NextResponse.json({
        success: true,
        message: 'Monime account already exists',
        monimeAccountId: existingUser.monime_financial_account_id,
        isNew: false
      })
    }

    // Create Monime financial account
    const monime = getMonimeClient()
    const monimeAccount = await monime.createFinancialAccount({
      name: `Utopia User ${walletAddress.slice(0, 8)}`,
      currency: 'SLE',
      metadata: {
        wallet_address: walletAddress,
        email: email || '',
        platform: 'utopia',
        created_at: new Date().toISOString()
      }
    })

    console.log('[CreateMonime] Created:', monimeAccount.id)

    // Update Supabase with Monime account ID (if user profile exists)
    if (existingUser) {
      await supabase
        .from('user_profiles')
        .update({
          monime_financial_account_id: monimeAccount.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Monime account created',
      monimeAccountId: monimeAccount.id,
      isNew: true
    })

  } catch (error: any) {
    console.error('[CreateMonime] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create Monime account' },
      { status: 500 }
    )
  }
}
