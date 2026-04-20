'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { useState, useEffect, useMemo } from 'react'
import { useVotingProgram } from '../voting/voting-data-access'
import { VotingSection } from '../voting/voting-ui'
import { PollResultsCard } from '../ui/poll-results-card'
import { ConfirmationModal } from '../ui/confirmation-modal'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PollDetailProps {
  poll: any
  publicKey: any
  onUpdate: () => void
}

export function PollDetail({ poll, publicKey, onUpdate }: PollDetailProps) {
  const router = useRouter()
  const { ready, authenticated } = usePrivy()
  const { ready: walletsReady, wallets } = useWallets()
  const { getPollCandidates, getPollImageUrl, softDeletePoll } = useVotingProgram()

  const [candidates, setCandidates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showResults, setShowResults] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const solanaWallet = useMemo(() => {
    if (!ready || !authenticated || !walletsReady || wallets.length === 0) return null
    return wallets[0]
  }, [ready, authenticated, walletsReady, wallets])

  const isCreator = useMemo(() => {
    if (!authenticated || wallets.length === 0 || !poll.pollAdmin) return false
    return wallets[0]?.address === poll.pollAdmin.toString()
  }, [authenticated, wallets, poll.pollAdmin])

  // Load candidates
  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const candidatesData = await getPollCandidates(poll.pollId.toNumber())
        setCandidates(candidatesData)
      } catch (error) {
        console.error('Error loading candidates:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadCandidates()
  }, [poll.pollId])

  const getPollStatus = () => {
    const now = Math.floor(Date.now() / 1000)
    const startTime = poll.pollStart.toNumber()
    const endTime = poll.pollEnd.toNumber()

    if (now > endTime) return 'ENDED'
    if (now < startTime) return 'UPCOMING'
    return 'LIVE'
  }

  const getTimeRemaining = () => {
    const now = Math.floor(Date.now() / 1000)
    const startTime = poll.pollStart.toNumber()
    const endTime = poll.pollEnd.toNumber()

    if (now > endTime) return 'Poll ended'

    if (now < startTime) {
      const timeUntilStart = startTime - now
      const days = Math.floor(timeUntilStart / 86400)
      const hours = Math.floor((timeUntilStart % 86400) / 3600)
      if (days > 0) return `Starts in ${days}d ${hours}h`
      if (hours > 0) return `Starts in ${hours}h`
      return `Starts in ${Math.floor(timeUntilStart / 60)}m`
    }

    const timeRemaining = endTime - now
    const days = Math.floor(timeRemaining / 86400)
    const hours = Math.floor((timeRemaining % 86400) / 3600)
    if (days > 0) return `${days}d ${hours}h remaining`
    if (hours > 0) return `${hours}h remaining`
    return `${Math.floor(timeRemaining / 60)}m remaining`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleShare = async () => {
    const pollUrl = `${window.location.origin}/poll/${poll.pollId.toString()}`
    try {
      await navigator.clipboard.writeText(pollUrl)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      toast.success('Poll link copied to clipboard!')
    } catch (err) {
      toast.error('Failed to copy link')
    }
  }

  const defaultImage = 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=1600&q=80'
  const customImage = getPollImageUrl(poll.pollId.toNumber())
  const displayImage = customImage || defaultImage
  const totalVotes = candidates.reduce((sum, c) => sum + Number(c.account.candidateVotes), 0)
  const status = getPollStatus()

  const handleDeletePoll = async () => {
    try {
      await softDeletePoll.mutateAsync({ pollId: poll.pollId.toNumber() })
      setShowDeleteConfirm(false)
      toast.success('Poll deleted successfully')
      router.push('/voting')
    } catch (error) {
      console.error('Error deleting poll:', error)
    }
  }

  return (
    <>
      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeletePoll}
        title="Delete Poll"
        message={
          <div className="space-y-2">
            <p>Are you sure you want to delete this poll?</p>
            <p className="text-lg font-bold text-red-400">{poll.description}</p>
            <p className="text-xs mt-3 text-[#F5F5DC]/60">
              This will hide the poll from the public list. The on-chain data will remain intact.
            </p>
          </div>
        }
        confirmText={softDeletePoll.isPending ? 'Deleting...' : 'Delete Poll'}
        cancelText="Cancel"
      />

      {/* Results Modal */}
      <PollResultsCard
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        pollId={poll.pollId.toNumber()}
        pollDescription={poll.description}
        candidates={candidates.map(c => ({
          name: c.account.candidateName,
          votes: Number(c.account.candidateVotes)
        }))}
        totalVotes={totalVotes}
      />

      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="border-b-2 border-border bg-card">
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-4">
            <nav className="flex items-center gap-2 text-sm font-mono">
              <Link href="/voting" className="text-muted-foreground hover:text-foreground transition-colors">
                Polls
              </Link>
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-foreground font-bold">Poll #{poll.pollId.toString()}</span>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Image */}
            <div className="space-y-4">
              {/* Main Image */}
              <div className="relative border-2 border-border overflow-hidden">
                <img
                  src={displayImage}
                  alt={poll.description}
                  className="w-full h-96 lg:h-[600px] object-cover"
                />

                {/* Status Badge Overlay */}
                <div className={`absolute top-6 right-6 px-4 py-2 border-2 font-bold text-sm uppercase tracking-wide ${
                  status === 'LIVE' ? 'bg-accent border-accent text-background' :
                  status === 'ENDED' ? 'bg-red-500 border-red-500 text-white' :
                  'bg-yellow-500 border-yellow-500 text-black'
                }`}>
                  {status}
                </div>
              </div>

              {/* Share Section */}
              <div className="flex gap-3">
                <button
                  onClick={handleShare}
                  className="flex-1 px-6 py-3 bg-transparent border-2 border-border text-foreground font-bold text-sm uppercase tracking-wide hover:border-accent transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  {isCopied ? 'Link Copied!' : 'Share Poll'}
                </button>

                {status === 'ENDED' && (
                  <button
                    onClick={() => setShowResults(true)}
                    className="flex-1 px-6 py-3 bg-accent border-2 border-accent text-background font-bold text-sm uppercase tracking-wide hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    View Results
                  </button>
                )}

                {/* Delete Button - Only visible to poll creator */}
                {isCreator && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-3 bg-transparent border-2 border-red-500/50 text-red-500 font-bold text-sm uppercase tracking-wide hover:border-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                    title="Delete Poll"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Right Column - Voting First, then Details */}
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h1 className="text-4xl font-bold text-foreground uppercase tracking-wide brutalist-title mb-2">
                  {poll.description}
                </h1>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground font-mono text-sm">
                    Poll #{poll.pollId.toString()}
                  </span>
                  <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    status === 'LIVE' ? 'bg-accent text-background' :
                    status === 'ENDED' ? 'bg-red-500 text-white' :
                    'bg-yellow-500 text-black'
                  }`}>
                    {status} • {getTimeRemaining()}
                  </span>
                </div>
              </div>

              {/* Login Prompt */}
              {!authenticated && status === 'LIVE' && (
                <div className="bg-accent/10 border-2 border-accent p-6 text-center">
                  <p className="font-bold text-lg mb-2 uppercase tracking-wide text-foreground">Login Required</p>
                  <p className="text-sm text-muted-foreground font-mono mb-4">
                    Login with your email to vote on this poll
                  </p>
                </div>
              )}

              {/* Voting Section - Now at the top */}
              {isLoading ? (
                <div className="flex justify-center py-12 bg-card border-2 border-border">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                </div>
              ) : candidates.length > 0 ? (
                <div className="bg-card border-2 border-border p-6">
                  <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide mb-6 brutalist-title">
                    {status === 'LIVE' ? 'Cast Your Vote' : status === 'ENDED' ? 'Final Results' : 'Candidates'}
                  </h2>
                  <VotingSection
                    pollId={poll.pollId.toNumber()}
                    pollDescription={poll.description}
                    candidates={candidates}
                    isActive={status === 'LIVE'}
                    onUpdate={onUpdate}
                  />
                </div>
              ) : (
                <div className="text-center py-12 bg-card border-2 border-border">
                  <p className="text-foreground font-bold uppercase tracking-wide mb-2">No Candidates Yet</p>
                  <p className="text-sm text-muted-foreground font-mono">Candidates will be added soon</p>
                </div>
              )}

              {/* Poll Details Section - Now below voting */}
              <div className="bg-card border-2 border-border p-6">
                <h3 className="text-lg font-bold text-foreground uppercase tracking-wide mb-4">Poll Details</h3>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-muted/20 border-2 border-border p-3">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-1">
                      Total Votes
                    </div>
                    <div className="text-xl font-bold text-accent">
                      {isLoading ? '...' : totalVotes.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-muted/20 border-2 border-border p-3">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-1">
                      Candidates
                    </div>
                    <div className="text-xl font-bold text-foreground">
                      {isLoading ? '...' : candidates.length}
                    </div>
                  </div>

                  <div className="bg-muted/20 border-2 border-border p-3">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-1">
                      Status
                    </div>
                    <div className={`text-lg font-bold ${
                      status === 'LIVE' ? 'text-accent' :
                      status === 'ENDED' ? 'text-red-500' :
                      'text-yellow-500'
                    }`}>
                      {status}
                    </div>
                  </div>
                </div>

                {/* Time Info */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground font-mono font-bold uppercase">Start</span>
                    <span className="text-foreground font-mono">{formatDate(poll.pollStart.toNumber())}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground font-mono font-bold uppercase">End</span>
                    <span className="text-foreground font-mono">{formatDate(poll.pollEnd.toNumber())}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
