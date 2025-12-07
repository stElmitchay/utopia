/**
 * Refund Credits to User
 *
 * POST /api/credits/refund
 * Body: { walletAddress: string, amount: number, reason: string, originalTransferId?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { refundCreditsToUser } from '@/lib/credits-service'
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
    const body = await req.json()
    const { walletAddress, amount, reason, originalTransferId } = body

    // Validate inputs
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'Invalid refund amount' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Refund reason is required' },
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

    // Refund credits
    const result = await refundCreditsToUser({
      userId: user.id,
      amount,
      reason,
      originalTransferId
    })

    return NextResponse.json({
      success: true,
      transferId: result.transferId,
      newBalance: result.newBalance,
      refunded: amount
    })
  } catch (error: any) {
    console.error('Error refunding credits:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to refund credits' },
      { status: 500 }
    )
  }
}
