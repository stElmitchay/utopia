/**
 * User Onboarding Setup
 *
 * POST /api/onboarding/setup
 * Body: { walletAddress: string, email?: string, displayName?: string }
 *
 * This endpoint:
 * 1. Creates user profile in Supabase (if doesn't exist)
 * 2. Creates Monime financial account for the user
 * 3. Airdrops 2 SOL to user's wallet
 * 4. Returns setup status
 */

import { NextRequest, NextResponse } from 'next/server'
import { createUserFinancialAccount } from '@/lib/credits-service'
import { createClient } from '@supabase/supabase-js'
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseKey)
}

async function airdropSOL(walletAddress: string): Promise<string> {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
  const connection = new Connection(rpcUrl, 'confirmed')

  try {
    const publicKey = new PublicKey(walletAddress)

    // Airdrop 2 SOL
    const signature = await connection.requestAirdrop(
      publicKey,
      2 * LAMPORTS_PER_SOL
    )

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed')

    return signature
  } catch (error: any) {
    console.error('Airdrop failed:', error)
    throw new Error(`Airdrop failed: ${error.message}`)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { walletAddress, email, displayName } = body

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // 1. Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, monime_financial_account_id, sol_wallet_address')
      .eq('wallet_address', walletAddress)
      .single()

    if (existingUser) {
      // User already onboarded
      return NextResponse.json({
        success: true,
        alreadyOnboarded: true,
        userId: existingUser.id,
        monimeAccountId: existingUser.monime_financial_account_id
      })
    }

    // 2. Create user profile
    const { data: newUser, error: userError } = await supabase
      .from('user_profiles')
      .insert({
        wallet_address: walletAddress,
        display_name: displayName || `User_${walletAddress.slice(0, 6)}`,
        email: email,
        sol_wallet_address: walletAddress,
        credit_balance: 0
      })
      .select()
      .single()

    if (userError || !newUser) {
      throw new Error(`Failed to create user profile: ${userError?.message}`)
    }

    // 3. Create Monime financial account
    let monimeAccountId: string
    try {
      monimeAccountId = await createUserFinancialAccount({
        userId: newUser.id,
        walletAddress,
        displayName: displayName,
        email: email
      })
    } catch (error: any) {
      console.error('Failed to create Monime account:', error)
      // Don't fail the entire onboarding if Monime fails
      // User can still use the app, but won't have credits yet
      monimeAccountId = ''
    }

    // 4. Airdrop SOL (only on devnet)
    let airdropSignature = ''
    try {
      airdropSignature = await airdropSOL(walletAddress)
    } catch (error: any) {
      console.error('Airdrop failed:', error)
      // Don't fail onboarding if airdrop fails
      // User can still get SOL manually
    }

    return NextResponse.json({
      success: true,
      alreadyOnboarded: false,
      userId: newUser.id,
      monimeAccountId,
      airdropSignature,
      message: 'Account setup complete!'
    })
  } catch (error: any) {
    console.error('Onboarding error:', error)

    return NextResponse.json(
      { error: 'Onboarding failed', message: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to check onboarding status
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

    const { data: user } = await supabase
      .from('user_profiles')
      .select('id, monime_financial_account_id, credit_balance, created_at')
      .eq('wallet_address', walletAddress)
      .single()

    if (!user) {
      return NextResponse.json({
        onboarded: false,
        needsSetup: true
      })
    }

    return NextResponse.json({
      onboarded: true,
      needsSetup: false,
      userId: user.id,
      hasMonimeAccount: !!user.monime_financial_account_id,
      creditBalance: user.credit_balance,
      memberSince: user.created_at
    })
  } catch (error: any) {
    console.error('Error checking onboarding status:', error)

    return NextResponse.json(
      { error: 'Failed to check status', message: error.message },
      { status: 500 }
    )
  }
}
