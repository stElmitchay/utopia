/**
 * Credits Data Access Layer
 *
 * React Query hooks for managing user credits
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { toast } from 'react-hot-toast'
import { useMemo } from 'react'

// ============================================================================
// Types
// ============================================================================

export interface UserCredits {
  balance: number
  monimeAccountId: string | null
  lastSync: string | null
}

export interface CreditTransaction {
  id: string
  type: 'deposit' | 'vote' | 'poll_creation' | 'refund'
  amount: number
  balanceBefore: number
  balanceAfter: number
  pollId?: number
  createdAt: string
  metadata?: any
}

// ============================================================================
// Wallet Hook
// ============================================================================

/**
 * Get connected wallet address
 */
function useWalletAddress(): string | undefined {
  const { ready, authenticated } = usePrivy()
  const { ready: walletsReady, wallets } = useWallets()

  return useMemo(() => {
    if (!ready || !authenticated || !walletsReady || wallets.length === 0) {
      return undefined
    }
    return wallets[0]?.address
  }, [ready, authenticated, walletsReady, wallets])
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchUserCredits(walletAddress: string): Promise<UserCredits> {
  const response = await fetch(`/api/credits/balance?wallet=${walletAddress}`)

  if (!response.ok) {
    throw new Error('Failed to fetch credits')
  }

  return response.json()
}

async function fetchCreditTransactions(
  walletAddress: string
): Promise<CreditTransaction[]> {
  const response = await fetch(`/api/credits/transactions?wallet=${walletAddress}`)

  if (!response.ok) {
    throw new Error('Failed to fetch transactions')
  }

  return response.json()
}

async function createCheckoutSession(params: {
  walletAddress: string
  amount: number
}): Promise<{ checkoutUrl: string }> {
  const response = await fetch('/api/credits/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create checkout session')
  }

  return response.json()
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Get user's credit balance
 */
export function useUserCredits() {
  const walletAddress = useWalletAddress()

  return useQuery({
    queryKey: ['credits', 'balance', walletAddress],
    queryFn: () => fetchUserCredits(walletAddress!),
    enabled: !!walletAddress,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    staleTime: 10 * 1000 // Consider stale after 10 seconds
  })
}

/**
 * Get user's credit transaction history
 */
export function useCreditTransactions() {
  const walletAddress = useWalletAddress()

  return useQuery({
    queryKey: ['credits', 'transactions', walletAddress],
    queryFn: () => fetchCreditTransactions(walletAddress!),
    enabled: !!walletAddress
  })
}

/**
 * Manually refresh credit balance
 */
export function useRefreshCredits() {
  const queryClient = useQueryClient()
  const walletAddress = useWalletAddress()

  return useMutation({
    mutationKey: ['credits', 'refresh'],
    mutationFn: async () => {
      if (!walletAddress) throw new Error('Wallet not connected')

      const response = await fetch(
        `/api/credits/refresh?wallet=${walletAddress}`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('Failed to refresh balance')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['credits', 'balance', walletAddress]
      })
    }
  })
}

/**
 * Create checkout session for purchasing credits
 */
export function usePurchaseCredits() {
  const walletAddress = useWalletAddress()

  return useMutation({
    mutationKey: ['credits', 'purchase'],
    mutationFn: async (amount: number) => {
      if (!walletAddress) {
        throw new Error('Wallet not connected')
      }

      return createCheckoutSession({ walletAddress, amount })
    },
    onSuccess: (data) => {
      // Redirect to checkout page
      window.location.href = data.checkoutUrl
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to initiate purchase')
    }
  })
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Check if user has sufficient credits
 */
export function useHasSufficientCredits(requiredAmount: number): boolean {
  const { data: credits } = useUserCredits()
  return (credits?.balance || 0) >= requiredAmount
}

/**
 * Get formatted credit balance
 */
export function useFormattedCredits(): string {
  const { data: credits, isLoading } = useUserCredits()

  if (isLoading) return '...'
  if (!credits) return '0'

  return credits.balance.toLocaleString()
}
