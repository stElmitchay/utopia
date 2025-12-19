/**
 * Credits Service Layer
 *
 * This module provides business logic for managing user credits,
 * integrating Monime API with Supabase database.
 */

import { getMonimeClient, deductCredits, refundCredits, hasSufficientCredits } from './monime'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// Types
// ============================================================================

export interface CreditTransaction {
  id: string
  userId: string
  transactionType: 'deposit' | 'vote' | 'poll_creation' | 'refund'
  amount: number
  balanceBefore: number
  balanceAfter: number
  monimeTransferId?: string
  monimeCheckoutSessionId?: string
  pollId?: number
  metadata?: Record<string, any>
  createdAt: string
}

export interface UserCredits {
  userId: string
  walletAddress: string
  creditBalance: number
  monimeFinancialAccountId?: string
  lastBalanceSync?: string
}

// ============================================================================
// Supabase Client
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient(supabaseUrl, supabaseKey)
}

// ============================================================================
// User Account Management
// ============================================================================

/**
 * Create Monime financial account for new user
 */
export async function createUserFinancialAccount(params: {
  userId: string
  walletAddress: string
  displayName?: string
  email?: string
}): Promise<string> {
  const monime = getMonimeClient()
  const supabase = getSupabaseClient()

  // Check if user already has an account
  const { data: existingUser } = await supabase
    .from('user_profiles')
    .select('monime_financial_account_id')
    .eq('id', params.userId)
    .single()

  if (existingUser?.monime_financial_account_id) {
    return existingUser.monime_financial_account_id
  }

  // Create financial account in Monime
  const account = await monime.createFinancialAccount({
    name: `utopia_${params.walletAddress.slice(0, 8)}`,
    currency: 'SLE',
    metadata: {
      utopia_user_id: params.userId,
      wallet_address: params.walletAddress,
      display_name: params.displayName,
      email: params.email
    }
  })

  // Update user profile with Monime account ID
  const { error } = await supabase
    .from('user_profiles')
    .update({
      monime_financial_account_id: account.id,
      credit_balance: 0,
      last_balance_sync: new Date().toISOString()
    })
    .eq('id', params.userId)

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`)
  }

  return account.id
}

// ============================================================================
// Balance Management
// ============================================================================

/**
 * Get user's credit balance (from cache or Monime)
 * Returns balance in major units (e.g., 4.95 SLE) for display
 * Database stores balance in minor units (e.g., 495 cents)
 */
export async function getUserCredits(
  userId: string,
  forceRefresh: boolean = false
): Promise<number> {
  const supabase = getSupabaseClient()

  // Get user data
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('monime_financial_account_id, credit_balance, last_balance_sync')
    .eq('id', userId)
    .single()

  if (error || !user) {
    throw new Error('User not found')
  }

  if (!user.monime_financial_account_id) {
    throw new Error('User does not have a Monime financial account')
  }

  // Check if cache is fresh (within 10 minutes) and not forcing refresh
  const lastSync = user.last_balance_sync ? new Date(user.last_balance_sync) : null
  const isCacheFresh =
    lastSync && Date.now() - lastSync.getTime() < 10 * 60 * 1000

  if (!forceRefresh && isCacheFresh) {
    // Convert from minor units (cents) to major units for display
    return (user.credit_balance || 0) / 100
  }

  // Fetch fresh balance from Monime (returns major units)
  return await syncUserBalance(userId, user.monime_financial_account_id)
}

/**
 * Sync user balance from Monime to Supabase
 * Note: Database stores balance in minor units (cents), API returns major units for display
 */
export async function syncUserBalance(
  userId: string,
  monimeAccountId: string,
  syncType: 'scheduled' | 'action_triggered' | 'manual' = 'manual'
): Promise<number> {
  const monime = getMonimeClient()
  const supabase = getSupabaseClient()

  // Get current cached balance
  const { data: user } = await supabase
    .from('user_profiles')
    .select('credit_balance')
    .eq('id', userId)
    .single()

  const cachedBalance = user?.credit_balance || 0

  // Fetch balance from Monime in minor units (cents)
  const monimeBalanceMinorUnits = await monime.getBalanceMinorUnits(monimeAccountId)

  // Update database via stored procedure (stores minor units)
  const { error: updateError } = await supabase.rpc('update_user_credit_balance', {
    p_user_id: userId,
    p_new_balance: monimeBalanceMinorUnits,
    p_sync_type: syncType
  })

  if (updateError) {
    console.error('Failed to update user balance:', updateError)
  }

  // Return major units for display
  return monimeBalanceMinorUnits / 100
}

/**
 * Sync all user balances (for scheduled background job)
 */
export async function syncAllUserBalances(): Promise<void> {
  const supabase = getSupabaseClient()

  // Get all users with Monime accounts
  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('id, monime_financial_account_id')
    .not('monime_financial_account_id', 'is', null)

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  // Sync each user's balance
  const syncPromises = users.map((user) =>
    syncUserBalance(user.id, user.monime_financial_account_id, 'scheduled')
  )

  await Promise.allSettled(syncPromises)
}

// ============================================================================
// Credit Purchases (Deposits)
// ============================================================================

/**
 * Create checkout session for user to buy credits
 */
export async function createCreditPurchaseSession(params: {
  userId: string
  amount: number
  successUrl?: string
  cancelUrl?: string
}): Promise<string> {
  const supabase = getSupabaseClient()
  const monime = getMonimeClient()

  // Get user's Monime account
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('monime_financial_account_id, wallet_address')
    .eq('id', params.userId)
    .single()

  if (error || !user) {
    throw new Error('User not found')
  }

  if (!user.monime_financial_account_id) {
    throw new Error('User does not have a financial account')
  }

  // Create checkout session (payment goes directly to user's account)
  const session = await monime.createCheckoutSession({
    amount: params.amount,
    financialAccountId: user.monime_financial_account_id,
    currency: 'SLE',
    name: `${params.amount} Utopia Credits`,
    description: `Top up your Utopia account with ${params.amount} credits`,
    successUrl: params.successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/credits/success`,
    cancelUrl: params.cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/credits/cancel`,
    metadata: {
      utopia_user_id: params.userId,
      wallet_address: user.wallet_address,
      action: 'credit_purchase'
    }
  })

  return session.redirectUrl
}

// ============================================================================
// Credit Spending (Votes & Polls)
// ============================================================================

/**
 * Deduct credits for voting
 */
export async function deductCreditsForVote(params: {
  userId: string
  pollId: number
  candidateName: string
  voteAmount: number
}): Promise<{ transferId: string; newBalance: number }> {
  const supabase = getSupabaseClient()

  // Get user's Monime account
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('monime_financial_account_id, credit_balance')
    .eq('id', params.userId)
    .single()

  if (error || !user) {
    throw new Error('User not found')
  }

  if (!user.monime_financial_account_id) {
    throw new Error('User does not have a financial account')
  }

  // Check sufficient balance
  const hasEnough = await hasSufficientCredits(
    user.monime_financial_account_id,
    params.voteAmount
  )

  if (!hasEnough) {
    throw new Error(
      `Insufficient credits. You have ${user.credit_balance}, need ${params.voteAmount}`
    )
  }

  // Deduct credits via Monime internal transfer
  const transfer = await deductCredits(user.monime_financial_account_id, params.voteAmount, {
    utopia_user_id: params.userId,
    action: 'vote',
    poll_id: params.pollId,
    candidate_name: params.candidateName
  })

  // Record transaction in database
  const { error: txError } = await supabase.rpc('record_credit_transaction', {
    p_user_id: params.userId,
    p_transaction_type: 'vote',
    p_amount: -params.voteAmount,
    p_monime_transfer_id: transfer.id,
    p_poll_id: params.pollId,
    p_metadata: { candidate_name: params.candidateName }
  })

  if (txError) {
    console.error('Failed to record transaction:', txError)
  }

  // Sync balance immediately
  const newBalance = await syncUserBalance(
    params.userId,
    user.monime_financial_account_id,
    'action_triggered'
  )

  return { transferId: transfer.id, newBalance }
}

/**
 * Deduct credits for poll creation
 */
export async function deductCreditsForPollCreation(params: {
  userId: string
  pollId: number
  pollDescription: string
}): Promise<{ transferId: string; newBalance: number }> {
  const POLL_CREATION_COST = 2 // Fixed cost of 2 credits

  const supabase = getSupabaseClient()

  // Get user's Monime account
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('monime_financial_account_id, credit_balance')
    .eq('id', params.userId)
    .single()

  if (error || !user) {
    throw new Error('User not found')
  }

  if (!user.monime_financial_account_id) {
    throw new Error('User does not have a financial account')
  }

  // Check sufficient balance
  const hasEnough = await hasSufficientCredits(
    user.monime_financial_account_id,
    POLL_CREATION_COST
  )

  if (!hasEnough) {
    throw new Error(
      `Insufficient credits. You have ${user.credit_balance}, need ${POLL_CREATION_COST}`
    )
  }

  // Deduct credits via Monime internal transfer
  const transfer = await deductCredits(
    user.monime_financial_account_id,
    POLL_CREATION_COST,
    {
      utopia_user_id: params.userId,
      action: 'poll_creation',
      poll_id: params.pollId,
      poll_description: params.pollDescription
    }
  )

  // Record transaction in database
  const { error: txError } = await supabase.rpc('record_credit_transaction', {
    p_user_id: params.userId,
    p_transaction_type: 'poll_creation',
    p_amount: -POLL_CREATION_COST,
    p_monime_transfer_id: transfer.id,
    p_poll_id: params.pollId,
    p_metadata: { poll_description: params.pollDescription }
  })

  if (txError) {
    console.error('Failed to record transaction:', txError)
  }

  // Sync balance immediately
  const newBalance = await syncUserBalance(
    params.userId,
    user.monime_financial_account_id,
    'action_triggered'
  )

  return { transferId: transfer.id, newBalance }
}

// ============================================================================
// Refunds
// ============================================================================

/**
 * Refund credits to user (e.g., if vote transaction fails)
 */
export async function refundCreditsToUser(params: {
  userId: string
  amount: number
  reason: string
  originalTransferId?: string
}): Promise<{ transferId: string; newBalance: number }> {
  const supabase = getSupabaseClient()

  // Get user's Monime account
  const { data: user, error } = await supabase
    .from('user_profiles')
    .select('monime_financial_account_id')
    .eq('id', params.userId)
    .single()

  if (error || !user || !user.monime_financial_account_id) {
    throw new Error('User not found or no financial account')
  }

  // Refund via Monime internal transfer
  const transfer = await refundCredits(user.monime_financial_account_id, params.amount, {
    utopia_user_id: params.userId,
    reason: params.reason,
    original_transfer_id: params.originalTransferId
  })

  // Record refund transaction
  const { error: txError } = await supabase.rpc('record_credit_transaction', {
    p_user_id: params.userId,
    p_transaction_type: 'refund',
    p_amount: params.amount,
    p_monime_transfer_id: transfer.id,
    p_metadata: {
      reason: params.reason,
      original_transfer_id: params.originalTransferId
    }
  })

  if (txError) {
    console.error('Failed to record refund transaction:', txError)
  }

  // Sync balance
  const newBalance = await syncUserBalance(
    params.userId,
    user.monime_financial_account_id,
    'action_triggered'
  )

  return { transferId: transfer.id, newBalance }
}

// ============================================================================
// Transaction History
// ============================================================================

/**
 * Get user's credit transaction history
 */
export async function getUserTransactions(
  userId: string,
  limit: number = 50
): Promise<CreditTransaction[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  return data as CreditTransaction[]
}

/**
 * Get credit spending statistics for a poll
 */
export async function getPollCreditStats(pollId: number) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('poll_credit_stats')
    .select('*')
    .eq('poll_id', pollId)
    .single()

  if (error) {
    console.error('Failed to fetch poll credit stats:', error)
    return null
  }

  return data
}

// ============================================================================
// Constants
// ============================================================================

export const POLL_CREATION_COST = 2 // 2 credits to create a poll
