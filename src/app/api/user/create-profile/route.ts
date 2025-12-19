/**
 * Create Supabase User Profile (Independent Operation)
 *
 * POST /api/user/create-profile
 * Body: { walletAddress: string, email?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single()

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: 'Profile already exists',
        userId: existingUser.id,
        isNew: false
      })
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
      console.error('[CreateProfile] Failed:', insertError)
      return NextResponse.json(
        { error: 'Failed to create profile', details: insertError?.message },
        { status: 500 }
      )
    }

    console.log('[CreateProfile] Created:', newUser.id)

    return NextResponse.json({
      success: true,
      message: 'Profile created',
      userId: newUser.id,
      isNew: true
    })

  } catch (error: any) {
    console.error('[CreateProfile] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create profile' },
      { status: 500 }
    )
  }
}
