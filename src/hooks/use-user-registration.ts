'use client'

import { useEffect, useRef } from 'react'
import { usePrivy } from '@privy-io/react-auth'

/**
 * Hook that automatically registers users when they log in.
 * Creates Supabase profile and Monime financial account.
 */
export function useUserRegistration() {
  const { ready, authenticated, user } = usePrivy()
  const hasRegistered = useRef(false)
  const registrationInProgress = useRef(false)

  useEffect(() => {
    console.log('[UserRegistration] Effect running:', {
      ready,
      authenticated,
      hasUser: !!user,
      linkedAccountsCount: user?.linkedAccounts?.length,
      hasRegistered: hasRegistered.current,
      inProgress: registrationInProgress.current
    })

    // Wait for Privy to be ready and user to be authenticated
    if (!ready || !authenticated || !user) {
      console.log('[UserRegistration] Waiting for auth...')
      return
    }

    // Prevent duplicate registrations
    if (hasRegistered.current || registrationInProgress.current) {
      console.log('[UserRegistration] Already registered or in progress')
      return
    }

    // Find Solana wallet in linked accounts
    const solanaWallet = user.linkedAccounts?.find(
      (account: any) =>
        account.type === 'wallet' &&
        account.chainType === 'solana' &&
        account.address
    ) as { address: string } | undefined

    if (!solanaWallet?.address) {
      console.log('[UserRegistration] No Solana wallet found in linkedAccounts:', user.linkedAccounts)
      return
    }

    const walletAddress = solanaWallet.address
    const email = user.email?.address

    console.log('[UserRegistration] Starting registration for:', walletAddress)

    // Mark registration in progress
    registrationInProgress.current = true

    // Register user
    fetch('/api/user/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, email })
    })
      .then(res => {
        console.log('[UserRegistration] Response status:', res.status)
        return res.json()
      })
      .then(data => {
        console.log('[UserRegistration] Response:', data)
        if (data.success) {
          hasRegistered.current = true
          console.log('[UserRegistration] ✅ Success:', data.isNew ? 'New user' : 'Existing user')
        } else {
          console.error('[UserRegistration] ❌ Failed:', data.error)
        }
      })
      .catch(err => {
        console.error('[UserRegistration] ❌ Error:', err)
      })
      .finally(() => {
        registrationInProgress.current = false
      })

  }, [ready, authenticated, user])

  return null
}
