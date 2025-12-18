/**
 * Get User Credit Transaction History
 *
 * GET /api/credits/transactions?wallet=<wallet_address>&limit=<number>
 */

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getUserTransactions } from '@/lib/credits-service'
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
    const limit = parseInt(searchParams.get('limit') || '50')

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
      .select('id')
      .eq('wallet_address', walletAddress)
      .single()

    if (userError || !user) {
      // Return empty array if user not found
      return NextResponse.json([])
    }

    // Get transactions
    const transactions = await getUserTransactions(user.id, limit)

    return NextResponse.json(transactions)
  } catch (error: any) {
    console.error('Error fetching transactions:', error)

    return NextResponse.json(
      { error: 'Failed to fetch transactions', message: error.message },
      { status: 500 }
    )
  }
}
