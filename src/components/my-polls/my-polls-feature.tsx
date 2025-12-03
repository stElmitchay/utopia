'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { useState, useMemo } from 'react'
import { useVotingProgram } from '../voting/voting-data-access'
import { PrivyWalletButton } from '../solana/privy-wallet-button'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

export function MyPollsFeature() {
  const { ready, authenticated } = usePrivy()
  const { ready: walletsReady, wallets } = useWallets()
  const { polls, getUserVoteRecords, getUserCreatedPolls } = useVotingProgram()
  const [activeTab, setActiveTab] = useState<'voted' | 'created'>('voted')

  // Manual refresh function
  const handleRefresh = () => {
    polls.refetch()
    getUserVoteRecords.refetch()
    getUserCreatedPolls.refetch()
  }

  const solanaWallet = useMemo(() => {
    if (!ready || !authenticated || !walletsReady || wallets.length === 0) {
      return null
    }
    return wallets[0]
  }, [ready, authenticated, walletsReady, wallets])

  // Get voted polls with full poll details from on-chain data
  const votedPollsWithDetails = useMemo(() => {
    if (!getUserVoteRecords.data || !polls.data) return []

    return getUserVoteRecords.data.map((voteRecord: any) => {
      const pollId = voteRecord.account.pollId?.toString()
      const pollData = polls.data.find((p: any) =>
        p.account.pollId?.toString() === pollId
      )
      return {
        pollId,
        candidateName: voteRecord.account.candidateVotedFor,
        timestamp: voteRecord.account.timestamp?.toNumber() * 1000,
        poll: pollData
      }
    }).filter((v: any) => v.poll)
  }, [getUserVoteRecords.data, polls.data])

  // Get created polls from on-chain data
  const createdPolls = useMemo(() => {
    if (!getUserCreatedPolls.data) return []
    return getUserCreatedPolls.data
  }, [getUserCreatedPolls.data])

  // Calculate stats
  const activeVotedPolls = votedPollsWithDetails.filter((v: any) => {
    if (!v.poll) return false
    const now = Math.floor(Date.now() / 1000)
    const end = v.poll.account.pollEnd?.toNumber() || 0
    return now <= end
  }).length

  const completedVotedPolls = votedPollsWithDetails.filter((v: any) => {
    if (!v.poll) return false
    const now = Math.floor(Date.now() / 1000)
    const end = v.poll.account.pollEnd?.toNumber() || 0
    return now > end
  }).length

  const isLoading = getUserVoteRecords.isLoading || getUserCreatedPolls.isLoading || polls.isLoading

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
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="brutalist-title text-3xl md:text-4xl text-foreground mb-2">
              MY POLLS
            </h1>
            <p className="text-muted-foreground font-mono text-sm">
              Your on-chain voting activity and created polls
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 border-2 border-border text-sm font-bold uppercase tracking-wide text-muted-foreground hover:border-accent hover:text-accent transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border-2 border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Polls Voted</p>
            <p className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : votedPollsWithDetails.length}
            </p>
          </div>
          <div className="bg-card border-2 border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Active Votes</p>
            <p className="text-2xl font-bold text-accent">
              {isLoading ? '...' : activeVotedPolls}
            </p>
          </div>
          <div className="bg-card border-2 border-border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Polls Created</p>
            <p className="text-2xl font-bold text-foreground">
              {isLoading ? '...' : createdPolls.length}
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
            Voted ({isLoading ? '...' : votedPollsWithDetails.length})
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
            Created ({isLoading ? '...' : createdPolls.length})
            {activeTab === 'created' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
              />
            )}
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        )}

        {/* Content */}
        {!isLoading && (
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
                    {votedPollsWithDetails.map((vote: any, index: number) => {
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
                                {vote.timestamp && (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    Voted: {new Date(vote.timestamp).toLocaleDateString()}
                                  </span>
                                )}
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
                {createdPolls.length === 0 ? (
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
                ) : (
                  <div className="space-y-4">
                    {createdPolls.map((pollAccount: any, index: number) => {
                      const poll = pollAccount.account
                      const pollId = poll.pollId?.toString()

                      const now = Math.floor(Date.now() / 1000)
                      const startTime = poll.pollStart?.toNumber() || 0
                      const endTime = poll.pollEnd?.toNumber() || 0
                      const isActive = now >= startTime && now <= endTime
                      const isPast = now > endTime
                      const isFuture = now < startTime

                      return (
                        <motion.div
                          key={pollId}
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
                                  ID: {pollId}
                                </span>
                                <span className="text-xs text-accent font-mono font-bold">
                                  CREATOR
                                </span>
                              </div>
                              <h3 className="text-lg font-bold text-foreground mb-2 truncate">
                                {poll.description || 'Untitled Poll'}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
                                <span>{poll.candidateAmount?.toString() || 0} candidates</span>
                                <span>•</span>
                                <span>
                                  {isFuture
                                    ? `Starts ${new Date(startTime * 1000).toLocaleDateString()}`
                                    : isPast
                                      ? `Ended ${new Date(endTime * 1000).toLocaleDateString()}`
                                      : `Ends ${new Date(endTime * 1000).toLocaleDateString()}`
                                  }
                                </span>
                              </div>
                            </div>
                            <Link
                              href={`/poll/${pollId}`}
                              className="px-4 py-2 border-2 border-accent text-sm font-bold uppercase tracking-wide text-accent hover:bg-accent hover:text-background transition-colors flex-shrink-0"
                            >
                              Manage
                            </Link>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
