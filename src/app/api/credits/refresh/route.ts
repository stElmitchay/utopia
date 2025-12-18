/**
 * Manually Refresh Credit Balance
 *
 * POST /api/credits/refresh?wallet=<wallet_address>
 */

import { NextRequest, NextResponse } from 'next/server'
import { syncUserBalance } from '@/lib/credits-service'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseKey)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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

    // Get user by wallet address
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, monime_financial_account_id')
      .eq('wallet_address', walletAddress)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.monime_financial_account_id) {
      return NextResponse.json(
        { error: 'User does not have a Monime account' },
        { status: 400 }
      )
    }

    // Force sync balance from Monime
    const newBalance = await syncUserBalance(
      user.id,
      user.monime_financial_account_id,
      'manual'
    )

    return NextResponse.json({
      success: true,
      balance: newBalance,
      syncedAt: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error refreshing balance:', error)

    return NextResponse.json(
      { error: 'Failed to refresh balance', message: error.message },
      { status: 500 }
    )
  }
}
