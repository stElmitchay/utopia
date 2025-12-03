'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { useState, useEffect, useMemo } from 'react'
import { useVotingProgram } from '../voting/voting-data-access'
import { PrivyWalletButton } from '../solana/privy-wallet-button'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface VoteRecord {
  pollId: string
  candidateName: string
  timestamp: number
  txSignature?: string
}

export function MyPollsFeature() {
  const { ready, authenticated } = usePrivy()
  const { ready: walletsReady, wallets } = useWallets()
  const { polls } = useVotingProgram()
  const [activeTab, setActiveTab] = useState<'voted' | 'created'>('voted')
  const [votedPolls, setVotedPolls] = useState<VoteRecord[]>([])

  const solanaWallet = useMemo(() => {
    if (!ready || !authenticated || !walletsReady || wallets.length === 0) {
      return null
    }
    return wallets[0]
  }, [ready, authenticated, walletsReady, wallets])

  // Load voted polls from localStorage
  useEffect(() => {
    if (solanaWallet?.address) {
      const storageKey = `votedPolls_${solanaWallet.address}`
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          // Convert old format (object) to new format (array) if needed
          if (Array.isArray(parsed)) {
            setVotedPolls(parsed)
          } else {
            // Old format: { pollId: candidateName }
            const converted = Object.entries(parsed).map(([pollId, candidateName]) => ({
              pollId,
              candidateName: candidateName as string,
              timestamp: Date.now()
            }))
            setVotedPolls(converted)
          }
        } catch (e) {
          console.error('Error parsing voted polls:', e)
          setVotedPolls([])
        }
      }
    }
  }, [solanaWallet?.address])

  // Get poll details for voted polls
  const votedPollsWithDetails = useMemo(() => {
    if (!polls.data || votedPolls.length === 0) return []

    return votedPolls.map(vote => {
      const pollData = polls.data.find((p: any) =>
        p.account.pollId?.toString() === vote.pollId
      )
      return {
        ...vote,
        poll: pollData
      }
    }).filter(v => v.poll) // Only include polls that still exist
  }, [polls.data, votedPolls])

  // Not authenticated state
  if (!authenticated || !solanaWallet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          <div className="bg-card border-2 border-border p-12 text-center">
            <div className="w-16 h-16 bg-accent/10 border-2 border-accent mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="brutalist-title text-3xl text-foreground mb-4">
              MY POLLS
            </h1>
            <p className="text-muted-foreground mb-8">
              Connect your wallet to view your voting history and created polls.
            </p>
            <PrivyWalletButton />
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="brutalist-title text-3xl md:text-4xl text-foreground mb-2">
            MY POLLS
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            Your voting activity and created polls
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border-2 border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Polls Voted</p>
            <p className="text-2xl font-bold text-foreground">{votedPolls.length}</p>
          </div>
          <div className="bg-card border-2 border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Active Votes</p>
            <p className="text-2xl font-bold text-accent">
              {votedPollsWithDetails.filter(v => {
                if (!v.poll) return false
                const now = Math.floor(Date.now() / 1000)
                const end = v.poll.account.pollEnd?.toNumber() || 0
                return now <= end
              }).length}
            </p>
          </div>
          <div className="bg-card border-2 border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Completed</p>
            <p className="text-2xl font-bold text-foreground">
              {votedPollsWithDetails.filter(v => {
                if (!v.poll) return false
                const now = Math.floor(Date.now() / 1000)
                const end = v.poll.account.pollEnd?.toNumber() || 0
                return now > end
              }).length}
            </p>
          </div>
          <div className="bg-card border-2 border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Wallet</p>
            <p className="text-sm font-mono text-foreground truncate">
              {solanaWallet.address.slice(0, 4)}...{solanaWallet.address.slice(-4)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b-2 border-border">
          <button
            onClick={() => setActiveTab('voted')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors relative ${
              activeTab === 'voted'
                ? 'text-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Voted ({votedPolls.length})
            {activeTab === 'voted' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('created')}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wide transition-colors relative ${
              activeTab === 'created'
                ? 'text-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Created
            {activeTab === 'created' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
              />
            )}
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'voted' && (
            <motion.div
              key="voted"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {votedPollsWithDetails.length === 0 ? (
                <div className="bg-card border-2 border-border p-12 text-center">
                  <div className="w-16 h-16 bg-muted mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">No votes yet</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    You haven&apos;t voted on any polls yet. Explore active polls and make your voice heard!
                  </p>
                  <Link
                    href="/voting"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-background font-bold uppercase tracking-wide text-sm hover:bg-accent/90 transition-colors"
                  >
                    Explore Polls
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {votedPollsWithDetails.map((vote, index) => {
                    const poll = vote.poll
                    if (!poll) return null

                    const now = Math.floor(Date.now() / 1000)
                    const startTime = poll.account.pollStart?.toNumber() || 0
                    const endTime = poll.account.pollEnd?.toNumber() || 0
                    const isActive = now >= startTime && now <= endTime
                    const isPast = now > endTime

                    return (
                      <motion.div
                        key={vote.pollId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-card border-2 border-border p-6 hover:border-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`text-xs px-2 py-1 font-bold uppercase tracking-wide ${
                                isActive
                                  ? 'bg-accent/10 text-accent border border-accent/30'
                                  : isPast
                                    ? 'bg-muted text-muted-foreground border border-border'
                                    : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
                              }`}>
                                {isActive ? 'Active' : isPast ? 'Ended' : 'Upcoming'}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                ID: {vote.pollId}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-2 truncate">
                              {poll.account.description || 'Untitled Poll'}
                            </h3>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="text-foreground">
                                  Voted for: <span className="font-bold text-accent">{vote.candidateName}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <Link
                            href={`/poll/${vote.pollId}`}
                            className="px-4 py-2 border-2 border-border text-sm font-bold uppercase tracking-wide text-muted-foreground hover:border-accent hover:text-accent transition-colors flex-shrink-0"
                          >
                            View
                          </Link>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'created' && (
            <motion.div
              key="created"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-card border-2 border-border p-12 text-center">
                <div className="w-16 h-16 bg-accent/10 border-2 border-accent/30 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Create Your First Poll</h3>
                <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                  Start a decentralized vote on any topic. Your poll will be recorded on the Solana blockchain for transparency.
                </p>
                <Link
                  href="/create-poll"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-background font-bold uppercase tracking-wide text-sm hover:bg-accent/90 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Poll
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
