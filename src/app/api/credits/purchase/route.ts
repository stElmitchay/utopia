/**
 * Create Credit Purchase Checkout Session
 *
 * POST /api/credits/purchase
 * Body: { walletAddress: string, amount: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createCreditPurchaseSession } from '@/lib/credits-service'
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
    const { walletAddress, amount } = body

    // Get base URL from request or environment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
      req.headers.get('origin') ||
      'http://localhost:3000'

    // Validate inputs
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: 'Minimum purchase amount is 1 credit' },
        { status: 400 }
      )
    }

    if (amount > 1000000) {
      return NextResponse.json(
        { error: 'Maximum purchase amount is 1,000,000 credits' },
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
        { error: 'User not found. Please ensure your account is set up.' },
        { status: 404 }
      )
    }

    if (!user.monime_financial_account_id) {
      return NextResponse.json(
        { error: 'Payment account not set up yet. Please try again in a moment.' },
        { status: 400 }
      )
    }

    // Create checkout session
    const checkoutUrl = await createCreditPurchaseSession({
      userId: user.id,
      amount,
      successUrl: `${baseUrl}/profile?topup=success`,
      cancelUrl: `${baseUrl}/profile?topup=cancelled`
    })

    return NextResponse.json({ checkoutUrl })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)

    return NextResponse.json(
      { error: 'Failed to create checkout session', message: error.message },
      { status: 500 }
    )
  }
}
