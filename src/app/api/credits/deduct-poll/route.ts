/**
 * Deduct Credits for Poll Creation
 *
 * POST /api/credits/deduct-poll
 * Body: { walletAddress: string, pollId: number, pollDescription: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { deductCreditsForPollCreation } from '@/lib/credits-service'
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
    const { walletAddress, pollId, pollDescription } = body

    // Validate inputs
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    if (!pollId) {
      return NextResponse.json(
        { error: 'Poll ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Get user by wallet address
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, monime_financial_account_id, credit_balance')
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
        { error: 'User does not have a Monime account. Please contact support.' },
        { status: 400 }
      )
    }

    // Deduct credits (will throw if insufficient balance)
    const result = await deductCreditsForPollCreation({
      userId: user.id,
      pollId,
      pollDescription: pollDescription || `Poll ${pollId}`
    })

    return NextResponse.json({
      success: true,
      transferId: result.transferId,
      newBalance: result.newBalance,
      deducted: 2
    })
  } catch (error: any) {
    console.error('Error deducting credits for poll:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to deduct credits' },
      { status: 500 }
    )
  }
}
