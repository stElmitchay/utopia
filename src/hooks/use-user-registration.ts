'use client'

import { useEffect, useRef } from 'react'
import { usePrivy } from '@privy-io/react-auth'

/**
 * Hook that automatically registers users when they log in.
 * Creates Supabase profile and Monime financial account.
 */
export function useUserRegistration() {
  const { authenticated, user } = usePrivy()
  const hasRegistered = useRef(false)

  useEffect(() => {
    // Only run once per session when user authenticates
    if (!authenticated || !user || hasRegistered.current) {
      return
    }

    // Get wallet address from Privy user
    const solanaWallet = user.linkedAccounts?.find(
      (account) =>
        account.type === 'wallet' && 'chainType' in account && account.chainType === 'solana'
    )

    const walletAddress = solanaWallet && 'address' in solanaWallet ? solanaWallet.address : null

    if (!walletAddress) {
      console.log('[UserRegistration] No Solana wallet found yet')
      return
    }
    const email = user.email?.address

    // Mark as registered to prevent duplicate calls
    hasRegistered.current = true

    // Register user asynchronously
    registerUser(walletAddress, email)
  }, [authenticated, user])

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
