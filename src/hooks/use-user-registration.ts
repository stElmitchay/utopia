'use client'

import { useEffect, useRef } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'

/**
 * Hook that automatically registers users when they log in.
 * Creates Supabase profile and Monime financial account.
 *
 * Uses useWallets() hook to properly detect when Solana wallet is ready,
 * as user.linkedAccounts may not update immediately after wallet creation.
 */
export function useUserRegistration() {
  const { authenticated, user } = usePrivy()
  const { ready: walletsReady, wallets } = useWallets()
  const hasRegistered = useRef(false)

  useEffect(() => {
    // Only run once per session when user authenticates and wallets are ready
    if (!authenticated || !user || !walletsReady || hasRegistered.current) {
      return
    }

    // Get wallet address from useWallets hook (more reliable than user.linkedAccounts)
    const solanaWallet = wallets[0]
    const walletAddress = solanaWallet?.address

    if (!walletAddress) {
      console.log('[UserRegistration] No Solana wallet found yet')
      return
    }

    const email = user.email?.address

    console.log('[UserRegistration] Wallet ready, registering user:', walletAddress)

    // Mark as registered to prevent duplicate calls
    hasRegistered.current = true

    // Register user asynchronously
    registerUser(walletAddress, email)
  }, [authenticated, user, walletsReady, wallets])

  return null
}

async function registerUser(walletAddress: string, email?: string) {
  try {
    console.log('[UserRegistration] Registering user:', walletAddress)

    const response = await fetch('/api/user/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, email })
    })

    const data = await response.json()

    if (data.success) {
      if (data.isNew) {
        console.log('[UserRegistration] New user registered:', data.userId)
      } else {
        console.log('[UserRegistration] Existing user found:', data.userId)
      }

      if (data.monimeAccountId) {
        console.log('[UserRegistration] Monime account:', data.monimeAccountId)
      } else if (data.warning) {
        console.warn('[UserRegistration] Warning:', data.warning)
      }
    } else {
      console.error('[UserRegistration] Failed:', data.error)
    }
  } catch (error) {
    console.error('[UserRegistration] Error:', error)
  }
}
