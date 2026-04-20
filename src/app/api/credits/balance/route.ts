/**
 * Get User Credit Balance
 *
 * GET /api/credits/balance?wallet=<wallet_address>
 *
 * Always fetches fresh balance from Monime and updates Supabase
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMonimeClient } from '@/lib/monime'

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
      return NextResponse.json({
        balance: 0,
        monimeAccountId: null,
        lastSync: null
      })
    }

    // If user doesn't have a Monime account yet, return 0
    if (!user.monime_financial_account_id) {
      return NextResponse.json({
        balance: 0,
        monimeAccountId: null,
        lastSync: null
      })
    }

    // Fetch balance directly from Monime
    const monime = getMonimeClient()
    const account = await monime.getFinancialAccount(user.monime_financial_account_id)

    // Debug: Log full account response
    console.log(`[Balance] Full Monime response:`, JSON.stringify(account, null, 2))

    const balanceMinorUnits = account.balance.available.value
    const balanceMajorUnits = balanceMinorUnits / 100

    console.log(`[Balance] Fetched from Monime: ${balanceMinorUnits} minor units (${balanceMajorUnits} SLE)`)

    // Update Supabase directly
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        credit_balance: balanceMinorUnits,
        last_balance_sync: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Balance] Failed to update Supabase:', updateError)
    } else {
      console.log(`[Balance] Updated Supabase: ${balanceMinorUnits} minor units`)
    }

    return NextResponse.json({
      balance: balanceMajorUnits,
      monimeAccountId: user.monime_financial_account_id,
      lastSync: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Balance] Error:', error)

    return NextResponse.json(
      { error: 'Failed to fetch credit balance', message: error.message },
      { status: 500 }
    )
  }
}
