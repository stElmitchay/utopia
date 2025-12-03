'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { PrivyWalletButton } from '../solana/privy-wallet-button'
// Comment out HiddenPollsList import
import { PollsList /* HiddenPollsList */ } from './voting-ui'
import { PollCreatorDashboard } from '../poll/poll-creator-dashboard'
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
  // Add filter state
  const [filter, setFilter] = useState<'active' | 'future' | 'past'>('active')
  const [view, setView] = useState<'all' | 'dashboard'>('all')

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="border-b-2 border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h1 className="brutalist-title text-5xl md:text-6xl lg:text-7xl text-foreground mb-3">
                {view === 'all' ? 'POLLS' : 'DASHBOARD'}
              </h1>
              <p className="text-muted-foreground text-lg font-mono">
                {view === 'all' ? 'Vote on active polls' : 'Manage your polls'}
              </p>
            </div>
            {authenticated && solanaWallet ? (
              <Link href="/create-poll" className="border-2 border-accent bg-accent text-background px-8 py-4 font-bold text-sm uppercase tracking-wide hover:bg-accent/90 transition-colors flex items-center gap-2">
                <span>+</span>
                <span>CREATE POLL</span>
              </Link>
            ) : (
              <PrivyWalletButton />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {/* View Toggle Tabs */}
        {authenticated && solanaWallet && (
          <div className="flex gap-6 mb-8 border-b-2 border-border">
            <button
              onClick={() => setView('all')}
              className={`px-6 py-4 font-bold text-sm uppercase tracking-wide transition-colors border-b-2 -mb-[2px] ${
                view === 'all'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              ALL POLLS
            </button>
            <button
              onClick={() => setView('dashboard')}
              className={`px-6 py-4 font-bold text-sm uppercase tracking-wide transition-colors border-b-2 -mb-[2px] ${
                view === 'dashboard'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              MY DASHBOARD
            </button>
          </div>
        )}

        {!authenticated && (
          <div className="mb-8 bg-accent/10 border-2 border-accent p-8 text-center">
            <p className="font-bold text-lg mb-2 uppercase tracking-wide">Connect Wallet</p>
            <p className="text-sm text-muted-foreground font-mono">
              Login with your email to vote on polls and create new ones.
            </p>
          </div>
        )}

        {/* Content Area */}
        {view === 'all' ? (
          <>
            {/* Filter Buttons */}
            <div className="flex justify-between items-center mb-8">
              <p className="text-muted-foreground font-mono text-sm uppercase tracking-wide">
                Filter by status
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setFilter('active')}
                  className={`px-6 py-3 font-bold text-sm uppercase tracking-wide border-2 transition-colors ${
                    filter === 'active'
                      ? 'bg-accent border-accent text-background'
                      : 'border-border text-foreground hover:border-accent'
                  }`}
                >
                  ACTIVE
                </button>
                <button
                  onClick={() => setFilter('future')}
                  className={`px-6 py-3 font-bold text-sm uppercase tracking-wide border-2 transition-colors ${
                    filter === 'future'
                      ? 'bg-accent border-accent text-background'
                      : 'border-border text-foreground hover:border-accent'
                  }`}
                >
                  FUTURE
                </button>
                <button
                  onClick={() => setFilter('past')}
                  className={`px-6 py-3 font-bold text-sm uppercase tracking-wide border-2 transition-colors ${
                    filter === 'past'
                      ? 'bg-accent border-accent text-background'
                      : 'border-border text-foreground hover:border-accent'
                  }`}
                >
                  PAST
                </button>
              </div>
            </div>

            <PollsList filter={filter} />
          </>
        ) : (
          <PollCreatorDashboard />
        )}
      </div>
    </div>
  )
}

// Export as default to maintain backward compatibility 
export default VotingFeature 