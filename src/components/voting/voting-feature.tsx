'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { PollsList } from './voting-ui'
import Link from 'next/link'
import { useState, useMemo } from 'react'

export function VotingFeature() {
  const { ready, authenticated } = usePrivy()
  const { ready: walletsReady, wallets } = useWallets()

  const solanaWallet = useMemo(() => {
    console.log('[VotingFeature] Debug:', { ready, authenticated, walletsReady, walletsCount: wallets.length })
    if (!ready || !authenticated || !walletsReady || wallets.length === 0) {
      console.log('[VotingFeature] Wallet not ready yet')
      return null
    }
    console.log('[VotingFeature] Wallet found:', wallets[0])
    return wallets[0] // First wallet is the embedded Solana wallet
  }, [ready, authenticated, walletsReady, wallets])

  const [filter, setFilter] = useState<'active' | 'future' | 'past'>('active')

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {/* Single Row: Filter + Create Button */}
        <div className="flex items-center justify-end gap-4 mb-8">
          {/* Filter Dropdown */}
          <button
            onClick={() => setFilter(filter === 'active' ? 'future' : filter === 'future' ? 'past' : 'active')}
            className="px-6 py-3 border-2 border-border text-foreground font-bold text-sm uppercase tracking-wide hover:border-accent transition-colors flex items-center gap-2"
          >
            <span>{filter === 'active' ? 'ACTIVE' : filter === 'future' ? 'FUTURE' : 'PAST'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Create Poll Button */}
          {authenticated && solanaWallet && (
            <Link href="/create-poll" className="border-2 border-accent bg-accent text-background px-6 py-3 font-bold text-sm uppercase tracking-wide hover:bg-accent/90 transition-colors flex items-center gap-2">
              <span>+</span>
              <span>CREATE POLL</span>
            </Link>
          )}
        </div>

        {!authenticated && (
          <div className="mb-8 bg-accent/10 border-2 border-accent p-8 text-center">
            <p className="font-bold text-lg mb-2 uppercase tracking-wide">Login</p>
            <p className="text-sm text-muted-foreground font-mono">
              Login to vote on polls and create new ones.
            </p>
          </div>
        )}

        {/* Polls Grid */}
        <PollsList filter={filter} />
      </div>
    </div>
  )
}

// Export as default to maintain backward compatibility 
export default VotingFeature 