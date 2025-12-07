/**
 * Onboarding Hook
 *
 * Automatically handles user onboarding when wallet connects
 */

'use client'

import { useEffect, useState, useMemo } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'

interface OnboardingStatus {
  isOnboarded: boolean
  isOnboarding: boolean
  error: string | null
}

export function useOnboarding() {
  const { ready, authenticated } = usePrivy()
  const { ready: walletsReady, wallets } = useWallets()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<OnboardingStatus>({
    isOnboarded: false,
    isOnboarding: false,
    error: null
  })

  const walletAddress = useMemo(() => {
    if (!ready || !authenticated || !walletsReady || wallets.length === 0) {
      return undefined
    }
    return wallets[0]?.address
  }, [ready, authenticated, walletsReady, wallets])

  useEffect(() => {
    if (!walletAddress) {
      setStatus({ isOnboarded: false, isOnboarding: false, error: null })
      return
    }

    // Check onboarding status
    const checkAndSetup = async () => {
      try {
        // 1. Check if user is already onboarded
        const checkResponse = await fetch(
          `/api/onboarding/setup?wallet=${walletAddress}`
        )

        if (!checkResponse.ok) {
          throw new Error('Failed to check onboarding status')
        }

        const checkData = await checkResponse.json()

        if (checkData.onboarded) {
          // User is already onboarded
          setStatus({ isOnboarded: true, isOnboarding: false, error: null })

          // Refresh credits data
          queryClient.invalidateQueries({ queryKey: ['credits'] })
          return
        }

        // 2. User needs onboarding - start setup
        setStatus({ isOnboarded: false, isOnboarding: true, error: null })

        const setupResponse = await fetch('/api/onboarding/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress })
        })

        if (!setupResponse.ok) {
          throw new Error('Onboarding setup failed')
        }

        const setupData = await setupResponse.json()

        if (setupData.success) {
          setStatus({ isOnboarded: true, isOnboarding: false, error: null })

          // Show success message
          if (!setupData.alreadyOnboarded) {
            toast.success('Welcome to Utopia! Your account is ready.', {
              duration: 5000,
              icon: '🎉'
            })

            if (setupData.airdropSignature) {
              console.log('SOL airdrop successful:', setupData.airdropSignature)
            }
          }

          // Refresh data
          queryClient.invalidateQueries({ queryKey: ['credits'] })
        } else {
          throw new Error('Onboarding setup returned unsuccessful status')
        }
      } catch (error: any) {
        console.error('Onboarding error:', error)
        setStatus({
          isOnboarded: false,
          isOnboarding: false,
          error: error.message
        })

        toast.error('Failed to set up your account. Please try again.', {
          duration: 6000
        })
      }
    }

    checkAndSetup()
  }, [walletAddress, queryClient])

  return status
}
