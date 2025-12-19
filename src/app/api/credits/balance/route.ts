/**
 * Get User Credit Balance
 *
 * GET /api/credits/balance?wallet=<wallet_address>
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserCredits } from '@/lib/credits-service'
import { createClient } from '@supabase/supabase-js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseKey)
}

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

    // Get user by wallet address
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, monime_financial_account_id, credit_balance, last_balance_sync')
      .eq('wallet_address', walletAddress)
      .single()

    if (userError || !user) {
      // User doesn't exist yet (first time login)
      return NextResponse.json({
        balance: 0,
        monimeAccountId: null,
        lastSync: null
      })
    }

    // If user doesn't have a Monime account yet, return cached balance
    if (!user.monime_financial_account_id) {
      return NextResponse.json({
        balance: user.credit_balance || 0,
        monimeAccountId: null,
        lastSync: user.last_balance_sync
      })
    }

    // Get balance (from cache or Monime)
    try {
      const balance = await getUserCredits(user.id, false)
      return NextResponse.json({
        balance,
        monimeAccountId: user.monime_financial_account_id,
        lastSync: user.last_balance_sync
      })
    } catch (balanceError: any) {
      // If Monime fetch fails, return cached balance
      console.error('Error fetching from Monime, using cache:', balanceError.message)
      return NextResponse.json({
        balance: user.credit_balance || 0,
        monimeAccountId: user.monime_financial_account_id,
        lastSync: user.last_balance_sync
      })
    }
  } catch (error: any) {
    console.error('Error fetching credit balance:', error)

    return NextResponse.json(
      { error: 'Failed to fetch credit balance', message: error.message },
      { status: 500 }
    )
  }
}
