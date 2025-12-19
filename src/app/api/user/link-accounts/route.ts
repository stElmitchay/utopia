/**
 * Link Monime Account to Supabase Profile
 *
 * POST /api/user/link-accounts
 * Body: { walletAddress: string, monimeAccountId: string }
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
    const { walletAddress, monimeAccountId } = body

    if (!walletAddress || !monimeAccountId) {
      return NextResponse.json(
        { error: 'Wallet address and Monime account ID are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Update the user profile with the Monime account ID
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        monime_financial_account_id: monimeAccountId,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress)
      .select('id, monime_financial_account_id')
      .single()

    if (error) {
      console.error('[LinkAccounts] Failed:', error)
      return NextResponse.json(
        { error: 'Failed to link accounts', details: error.message },
        { status: 500 }
      )
    }

    console.log('[LinkAccounts] Linked:', data)

    return NextResponse.json({
      success: true,
      message: 'Accounts linked successfully',
      userId: data.id,
      monimeAccountId: data.monime_financial_account_id
    })

  } catch (error: any) {
    console.error('[LinkAccounts] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to link accounts' },
      { status: 500 }
    )
  }
}
