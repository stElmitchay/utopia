'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useVotingProgram } from './voting-data-access'
import { ExplorerLink } from '../cluster/cluster-ui'
import { ellipsify } from '../ui/ui-layout'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from '../ui/confirmation-modal'
import { VoteReceipt } from '../ui/vote-receipt'
import { PollResultsCard } from '../ui/poll-results-card'
import Link from 'next/link'

// Component to create a new poll
export function CreatePollForm({ onPollCreated }: { onPollCreated?: (details: any) => void }) {
  const { initializePoll } = useVotingProgram()
  const [pollId, setPollId] = useState('')
  const [description, setDescription] = useState('')
  const [pollStart, setPollStart] = useState('')
  const [pollEnd, setPollEnd] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!pollId || !description || !pollStart || !pollEnd) {
      setError('All fields are required')
      return
    }

    // Prevent duplicate submissions
    if (isSubmitting) {
      setError('Please wait for the previous submission to complete')
      return
    }

    // Validate dates
    const startDate = new Date(pollStart)
    const endDate = new Date(pollEnd)
    const now = new Date()

    if (startDate < now) {
      setError('Start date cannot be in the past')
      return
    }

    if (endDate <= startDate) {
      setError('End date must be after start date')
      return
    }

    // Convert dates to Unix timestamps (seconds)
    const startTimestamp = Math.floor(startDate.getTime() / 1000)
    const endTimestamp = Math.floor(endDate.getTime() / 1000)

    const pollDetails = {
      pollId: parseInt(pollId),
      description,
      pollStart: startTimestamp,
      pollEnd: endTimestamp,
      imageUrl: imageUrl.trim() || undefined,
    }

    try {
      setIsSubmitting(true)

      if (onPollCreated) {
        onPollCreated(pollDetails)
      } else {
        await initializePoll.mutateAsync(pollDetails)

        // Reset form
        setPollId('')
        setDescription('')
        setPollStart('')
        setPollEnd('')
        setImageUrl('')
      }
    } catch (error: any) {
      console.error('Error creating poll:', error)
      let errorMessage = error.message || 'Failed to create poll'

      // Handle specific error cases
      if (errorMessage.includes('already been processed')) {
        errorMessage = 'This poll has already been created. Please try a different poll ID.'
      } else if (errorMessage.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds to create the poll.'
      }

      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-yellow-900/20 border-2 border-yellow-600/40 text-[#F5F5DC] px-4 py-4 rounded-lg text-sm">
        <div className="flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-bold mb-2 text-yellow-400">⚠️ Critical: Read Before Proceeding</p>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Immutable:</strong> Once created, polls cannot be edited or deleted</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Candidates Deadline:</strong> You MUST add all candidates in the next step. You cannot add candidates after the poll start time</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Blockchain:</strong> All details are permanently recorded on-chain</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span><strong>Time Windows:</strong> Double-check your start and end times - they cannot be changed</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-[#F5F5DC]">Poll ID</label>
        <input
          type="number"
          placeholder="Enter a unique identifier for your poll"
          className="w-full px-4 py-2.5 bg-[#2c5446] border border-[#2c5446] rounded-lg text-[#F5F5DC] text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] focus:border-transparent placeholder-[#F5F5DC]/50"
          value={pollId}
          onChange={(e) => setPollId(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-[#F5F5DC]">Description</label>
        <textarea
          placeholder="Describe what your poll is about"
          className="w-full px-4 py-2.5 bg-[#2c5446] border border-[#2c5446] rounded-lg text-[#F5F5DC] text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] focus:border-transparent placeholder-[#F5F5DC]/50"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-[#F5F5DC]">Image URL (optional)</label>
        <input
          type="url"
          placeholder="https://example.com/image.jpg"
          className="w-full px-4 py-2.5 bg-[#2c5446] border border-[#2c5446] rounded-lg text-[#F5F5DC] text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] focus:border-transparent placeholder-[#F5F5DC]/50"
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-[#F5F5DC]">Start Date</label>
          <input
            type="datetime-local"
            className="w-full px-4 py-2.5 bg-[#2c5446] border border-[#2c5446] rounded-lg text-[#F5F5DC] text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] focus:border-transparent"
            value={pollStart}
            onChange={(e) => setPollStart(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-[#F5F5DC]">End Date</label>
          <input
            type="datetime-local"
            className="w-full px-4 py-2.5 bg-[#2c5446] border border-[#2c5446] rounded-lg text-[#F5F5DC] text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] focus:border-transparent"
            value={pollEnd}
            onChange={(e) => setPollEnd(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="pt-2">
        <button
          type="submit"
          className="w-full px-4 py-2.5 bg-white text-[#0A1A14] text-sm font-medium rounded-lg hover:bg-[#A3E4D7] hover:text-[#0A1A14] transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={initializePoll.isPending}
        >
          {initializePoll.isPending ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-[#0A1A14] rounded-full"></div>
              <span>Creating...</span>
            </div>
          ) : (
            'Create Poll'
          )}
        </button>
      </div>
    </form>
  )
}

// Component to add a candidate to a poll
export function AddCandidateForm({ pollId, onUpdate }: { pollId: number; onUpdate?: () => void }) {
  const { initializeCandidate } = useVotingProgram()
  const [candidateName, setCandidateName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!candidateName.trim()) {
      setError('Candidate name is required')
      return
    }

    try {
      await initializeCandidate.mutateAsync({
        pollId,
        candidateName: candidateName.trim(),
      })

      setCandidateName('')
      if (onUpdate) onUpdate()
    } catch (error: any) {
      console.error('Error adding candidate:', error)
      setError(error.message || 'Failed to add candidate')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-900/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      <div className="space-y-1">
        <label className="text-sm font-medium text-[#F5F5DC]">Candidate Name</label>
        <input
          type="text"
          placeholder="Enter candidate name"
          className="w-full px-4 py-2.5 bg-[#2c5446] border border-[#2c5446] rounded-lg text-[#F5F5DC] text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] focus:border-transparent placeholder-[#F5F5DC]/50"
          value={candidateName}
          onChange={(e) => setCandidateName(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        className="w-full px-4 py-2.5 bg-white text-[#0A1A14] text-sm font-medium rounded-lg hover:bg-[#A3E4D7] hover:text-[#0A1A14] transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={initializeCandidate.isPending}
      >
        {initializeCandidate.isPending ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-[#0A1A14] rounded-full"></div>
            <span>Adding...</span>
          </div>
        ) : (
          'Add Candidate'
        )}
      </button>
    </form>
  )
}

// Component to vote for a candidate
export function VotingSection({
  pollId,
  pollDescription,
  candidates,
  isActive,
  onUpdate
}: {
  pollId: number;
  pollDescription: string;
  candidates: any[];
  isActive: boolean;
  onUpdate?: () => void;
}) {
  const { vote, REQUIRED_SOL_AMOUNT, solBalance, hasEnoughSol } = useVotingProgram()
  const { ready, authenticated } = usePrivy()
  const { ready: walletsReady, wallets } = useWallets()

  const solanaWallet = useMemo(() => {
    console.log('[VotingSection] Debug:', { ready, authenticated, walletsReady, walletsCount: wallets.length })
    if (!ready || !authenticated || !walletsReady || wallets.length === 0) return null
    return wallets[0] // First wallet is the embedded Solana wallet
  }, [ready, authenticated, walletsReady, wallets])

  const [voteError, setVoteError] = useState<string | null>(null)
  const [votingFor, setVotingFor] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [candidateToVoteFor, setCandidateToVoteFor] = useState<string | null>(null)
  const [showReceipt, setShowReceipt] = useState(false)
  const [voteReceiptData, setVoteReceiptData] = useState<{
    candidateName: string
    pollDescription: string
    transactionSignature?: string
  } | null>(null)

  const handleVoteClick = (candidateName: string) => {
    if (!authenticated || !solanaWallet) {
      toast.error('Please login to vote')
      return
    }

    // Prevent duplicate votes while transaction is pending
    if (votingFor) {
      toast.error('Please wait for your previous vote to complete')
      return
    }

    // Check for recent transactions in localStorage before attempting to vote
    const transactionId = `${pollId}-${candidateName}-${solanaWallet.address}`
    const processedVotes = JSON.parse(localStorage.getItem('processedVotes') || '{}')
    const recentVoteTime = processedVotes[transactionId]

    // If there's a recent vote (within the last 5 minutes), prevent duplicate
    if (recentVoteTime && (Date.now() - recentVoteTime) < 5 * 60 * 1000) {
      toast.error('You have already voted for this candidate recently')
      return
    }

    // Show confirmation dialog
    setCandidateToVoteFor(candidateName)
    setShowConfirmation(true)
  }

  const handleConfirmVote = async () => {
    if (!candidateToVoteFor) return

    setShowConfirmation(false)
    setVotingFor(candidateToVoteFor)
    setVoteError(null)

    try {
      const signature = await vote.mutateAsync({
        pollId,
        candidateName: candidateToVoteFor,
      })

      // Store the transaction ID locally to prevent duplicate submissions
      const transactionId = `${pollId}-${candidateToVoteFor}-${solanaWallet?.address || 'unknown'}`
      const processedVotes = JSON.parse(localStorage.getItem('processedVotes') || '{}')
      processedVotes[transactionId] = Date.now()
      localStorage.setItem('processedVotes', JSON.stringify(processedVotes))

      // Show receipt
      setVoteReceiptData({
        candidateName: candidateToVoteFor,
        pollDescription: pollDescription,
        transactionSignature: typeof signature === 'string' ? signature : undefined
      })
      setShowReceipt(true)

      if (onUpdate) onUpdate()
    } catch (error: any) {
      console.error('Vote error:', error)
      const errorMessage = error.message || 'Failed to cast vote'
      
      // Handle specific error cases
      if (errorMessage.includes('already been processed') || errorMessage.includes('This transaction has already been processed')) {
        // If the transaction was already processed, treat it as a success
        toast.success('Vote was successfully processed!')

        // Store the transaction to prevent future duplicates
        const transactionId = `${pollId}-${candidateToVoteFor}-${solanaWallet?.address || 'unknown'}`
        const processedVotes = JSON.parse(localStorage.getItem('processedVotes') || '{}')
        processedVotes[transactionId] = Date.now()
        localStorage.setItem('processedVotes', JSON.stringify(processedVotes))
        
        if (onUpdate) onUpdate()
      } else {
        console.error(`Vote error: ${errorMessage}`)
        setVoteError(errorMessage)
        toast.error(`Voting failed: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}`)
      }
    } finally {
      setVotingFor(null)
      setCandidateToVoteFor(null)
    }
  }

  const totalVotes = candidates.reduce((sum, c) => sum + Number(c.account.candidateVotes), 0)

  return (
    <>
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => {
          setShowConfirmation(false)
          setCandidateToVoteFor(null)
        }}
        onConfirm={handleConfirmVote}
        title="Confirm Your Vote"
        message={
          <div className="space-y-2">
            <p>You are about to vote for:</p>
            <p className="text-lg font-bold text-[#A3E4D7]">{candidateToVoteFor}</p>
            <p className="text-xs mt-3 text-[#F5F5DC]/60">
              ⚠️ This action is permanent and cannot be undone. Your vote will be recorded on the Solana blockchain.
            </p>
          </div>
        }
        confirmText="Cast Vote"
        cancelText="Cancel"
      />

      {voteReceiptData && (
        <VoteReceipt
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false)
            setVoteReceiptData(null)
          }}
          candidateName={voteReceiptData.candidateName}
          pollDescription={voteReceiptData.pollDescription}
          pollId={pollId}
          transactionSignature={voteReceiptData.transactionSignature}
        />
      )}

    <div className="space-y-4">
      {/* Warnings & Errors */}
      {authenticated && solanaWallet && solBalance !== null && !hasEnoughSol && (
        <div className="bg-yellow-500/10 border-2 border-yellow-500 p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-bold text-yellow-500 uppercase tracking-wide mb-1">Insufficient Balance</p>
              <p className="text-xs text-foreground font-mono">
                You have {solBalance.toFixed(4)} SOL. You need at least {REQUIRED_SOL_AMOUNT} SOL to vote.
              </p>
            </div>
          </div>
        </div>
      )}

      {voteError && (
        <div className="bg-red-900/20 border-2 border-red-500/20 text-red-400 px-4 py-3 text-sm font-mono">
          {voteError}
        </div>
      )}

      {(!authenticated || !solanaWallet) && isActive && (
        <div className="bg-accent/10 border-2 border-accent p-4 text-center">
          <p className="text-sm font-bold text-foreground uppercase tracking-wide mb-1">Login Required</p>
          <p className="text-xs text-muted-foreground font-mono">Login to vote for a candidate</p>
        </div>
      )}

      {/* Candidates List */}
      <div className="space-y-3">
        {candidates.map((candidate, index) => {
          const candidateName = candidate.account.candidateName
          const voteCount = Number(candidate.account.candidateVotes)
          const votePercentage = totalVotes > 0
            ? Math.round((voteCount / totalVotes) * 100)
            : 0

          const canVote = isActive && authenticated && solanaWallet && (!voteError) && (solBalance !== null && hasEnoughSol)
          const isVoting = votingFor === candidateName
          const isLeading = index === 0 && totalVotes > 0

          return (
            <div key={index} className={`border-2 ${isLeading ? 'border-accent bg-accent/5' : 'border-border bg-card'} p-4`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  {isLeading && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  )}
                  <h4 className="text-lg font-bold text-foreground uppercase tracking-wide">{candidateName}</h4>
                </div>
                {isActive && (
                  <button
                    onClick={() => handleVoteClick(candidateName)}
                    className={`px-6 py-2 text-sm font-bold uppercase tracking-wide transition-colors border-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      canVote && !isVoting
                        ? 'bg-accent text-background border-accent hover:bg-accent/90'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}
                    disabled={!canVote || vote.isPending || isVoting}
                    title={!authenticated || !solanaWallet
                      ? 'Login to vote'
                      : !isActive
                      ? 'Poll is not active'
                      : voteError
                      ? 'Voting failed'
                      : ''}
                  >
                    {isVoting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-b-2 border-background"></div>
                        <span>Voting...</span>
                      </div>
                    ) : (
                      'Vote'
                    )}
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="h-3 w-full bg-background border-2 border-border overflow-hidden">
                  <div
                    className={`h-full ${isLeading ? 'bg-accent' : 'bg-muted'} transition-all duration-500`}
                    style={{ width: `${votePercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs font-mono font-bold">
                  <span className="text-foreground">{voteCount} votes</span>
                  <span className="text-muted-foreground">{votePercentage}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Total Votes Summary */}
      <div className="bg-card border-2 border-border p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-muted-foreground uppercase tracking-wide font-mono">Total Votes Cast</span>
          <span className="text-2xl font-bold text-accent">{totalVotes}</span>
        </div>
      </div>
    </div>
    </>
  )
}

// Component to display a poll with its candidates
export function PollCard({ poll, publicKey, onUpdate, isHidden = false, defaultExpanded = false }: { poll: any; publicKey: PublicKey; onUpdate: () => void; isHidden?: boolean; defaultExpanded?: boolean }) {
  const { getPollCandidates } = useVotingProgram()
  const [candidates, setCandidates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showVotingModal, setShowVotingModal] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Load candidates immediately
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

  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const status = getPollStatus()
    if (status === 'LIVE') {
      setShowVotingModal(true)
    } else if (status === 'ENDED') {
      setShowResults(true)
    }
  }

  const defaultImage = 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80'
  const totalVotes = candidates.reduce((sum, c) => sum + Number(c.account.candidateVotes), 0)
  const status = getPollStatus()
  const candidateNames = candidates.map(c => c.account.candidateName).join(' • ')
  const pollId = poll.pollId.toString()

  return (
    <>
      {/* Voting Modal */}
      {showVotingModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/70" onClick={() => setShowVotingModal(false)} />
            <div className="relative bg-card border-2 border-border max-w-3xl w-full p-6">
              <button
                onClick={() => setShowVotingModal(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground border-2 border-border p-1 hover:border-accent"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide brutalist-title mb-2">
                  {poll.description}
                </h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
                  <span className={`px-2 py-1 border-2 font-bold ${
                    status === 'LIVE' ? 'border-accent text-accent bg-accent/10' :
                    status === 'ENDED' ? 'border-red-500 text-red-500 bg-red-500/10' :
                    'border-yellow-500 text-yellow-500 bg-yellow-500/10'
                  }`}>
                    {status}
                  </span>
                  <span>{getTimeRemaining()}</span>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
                </div>
              ) : candidates.length > 0 ? (
                <VotingSection
                  pollId={poll.pollId.toNumber()}
                  pollDescription={poll.description}
                  candidates={candidates}
                  isActive={status === 'LIVE'}
                  onUpdate={() => {
                    onUpdate()
                    setShowVotingModal(false)
                  }}
                />
              ) : (
                <div className="text-center py-8 bg-muted/20 border-2 border-border">
                  <p className="text-foreground font-bold uppercase tracking-wide mb-1">No candidates yet</p>
                  <p className="text-sm text-muted-foreground font-mono">Candidates will be added soon</p>
                </div>
              )}

              {/* View Full Details Link */}
              <div className="mt-6 pt-4 border-t-2 border-border">
                <Link
                  href={`/poll/${pollId}`}
                  className="text-sm text-accent hover:text-accent/80 font-mono font-bold uppercase tracking-wide flex items-center gap-2"
                  onClick={() => setShowVotingModal(false)}
                >
                  View Full Poll Details
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

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

      <div className="bg-card border-2 border-border overflow-hidden hover:border-accent transition-all group">
        {/* Image Section - Click to view details */}
        <Link href={`/poll/${pollId}`}>
          <div className="relative h-48 overflow-hidden cursor-pointer">
            <img
              src={defaultImage}
              alt={poll.description}
              className="w-full h-full object-cover"
            />

            {/* Status Badge */}
            <div className={`absolute top-4 right-4 px-3 py-1 border-2 font-bold text-xs uppercase tracking-wide ${
              status === 'LIVE' ? 'bg-accent border-accent text-background' :
              status === 'ENDED' ? 'bg-red-500 border-red-500 text-white' :
              'bg-yellow-500 border-yellow-500 text-black'
            }`}>
              {status}
            </div>

            {/* Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <h3 className="text-white font-bold text-lg uppercase tracking-wide line-clamp-2">
                {poll.description}
              </h3>
            </div>
          </div>
        </Link>

        {/* Stats Row */}
        <div className="grid grid-cols-2 border-t-2 border-border">
          <div className="p-3 border-r-2 border-border">
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-1">
              Total Votes
            </div>
            <div className="text-lg font-bold text-foreground">
              {isLoading ? '...' : totalVotes}
            </div>
          </div>
          <div className="p-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-1">
              Time
            </div>
            <div className="text-xs font-bold text-foreground">
              {getTimeRemaining()}
            </div>
          </div>
        </div>

        {/* Candidates Preview */}
        <div className="p-4 border-t-2 border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-2">
            Candidates
          </div>
          <div className="text-sm text-foreground font-mono line-clamp-1">
            {isLoading ? 'Loading...' : candidateNames || 'No candidates yet'}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t-2 border-border flex gap-3">
          {/* Main Action Button */}
          <button
            onClick={handleActionClick}
            className={`flex-1 px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors border-2 flex items-center justify-center gap-2 ${
              status === 'LIVE'
                ? 'bg-accent text-background border-accent hover:bg-accent/90'
                : status === 'ENDED'
                ? 'bg-transparent text-accent border-accent hover:bg-accent/10'
                : 'bg-transparent text-foreground border-border hover:border-accent'
            }`}
          >
            {status === 'LIVE' && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Vote Now
              </>
            )}
            {status === 'ENDED' && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View Results
              </>
            )}
            {status === 'UPCOMING' && (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                View Details
              </>
            )}
          </button>

          {/* View Details Link - Always visible */}
          <Link
            href={`/poll/${pollId}`}
            className="px-4 py-3 text-sm font-bold uppercase tracking-wide transition-colors border-2 border-border text-muted-foreground hover:border-accent hover:text-foreground flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Details
          </Link>
        </div>
      </div>
    </>
  )
}

// Component to list all polls
export function PollsList({ filter = 'active' }: { filter?: 'active' | 'future' | 'past' }) {
  const { polls } = useVotingProgram()

  if (polls.isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (polls.error) {
    console.error('Error loading polls:', polls.error)
    return (
      <div className="bg-red-900/20 text-red-400 p-4 text-sm border-2 border-red-500/20">
        Error loading polls. Please try again.
      </div>
    )
  }

  if (!polls.data || polls.data.length === 0) {
    return (
      <div className="bg-card text-foreground p-8 text-center border-2 border-border">
        <p className="text-lg font-bold uppercase tracking-wide mb-2">No polls found</p>
        <p className="text-sm text-muted-foreground font-mono">Create one to get started!</p>
      </div>
    )
  }

  // Filter polls based on the selected filter
  const filteredPolls = polls.data.filter((poll: any) => {
    const now = Math.floor(Date.now() / 1000)
    const pollData = poll.account

    if (!pollData.pollStart || !pollData.pollEnd) {
      return false
    }

    const startTime = pollData.pollStart.toNumber()
    const endTime = pollData.pollEnd.toNumber()

    switch (filter) {
      case 'active':
        return now >= startTime && now <= endTime
      case 'future':
        return now < startTime
      case 'past':
        return now > endTime
      default:
        return true
    }
  })

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredPolls.map((pollAccount: any) => (
        <PollCard
          key={pollAccount.publicKey.toString()}
          poll={pollAccount.account}
          publicKey={pollAccount.publicKey}
          onUpdate={() => polls.refetch()}
        />
      ))}
    </div>
  )
}