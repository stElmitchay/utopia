'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useState, useEffect, useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
import { useVotingProgram } from './voting-data-access'
import { ExplorerLink } from '../cluster/cluster-ui'
import { ellipsify } from '../ui/ui-layout'
import { toast } from 'react-hot-toast'
import { ConfirmationModal } from '../ui/confirmation-modal'
import { VoteReceipt } from '../ui/vote-receipt'
import { PollResultsCard } from '../ui/poll-results-card'

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
  const { publicKey } = useWallet()
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
    if (!publicKey) {
      toast.error('Please connect your wallet to vote')
      return
    }

    // Prevent duplicate votes while transaction is pending
    if (votingFor) {
      toast.error('Please wait for your previous vote to complete')
      return
    }

    // Check for recent transactions in localStorage before attempting to vote
    const transactionId = `${pollId}-${candidateName}-${publicKey.toString()}`
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
      const transactionId = `${pollId}-${candidateToVoteFor}-${publicKey.toString()}`
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
        const transactionId = `${pollId}-${candidateToVoteFor}-${publicKey.toString()}`
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

    <div className="bg-[#2c5446] rounded-lg border border-[#2c5446] p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-[#F5F5DC]">Cast your vote</h3>
        <div className="text-sm text-[#F5F5DC]/70">
          <span className="inline-flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Requires {REQUIRED_SOL_AMOUNT} SOL to vote
          </span>
        </div>
      </div>

      {publicKey && (
        <div className="mb-4">
          {solBalance !== null && !hasEnoughSol && (
            <div className="p-3 rounded-lg text-sm bg-[#2c5446] text-[#F5F5DC]/70 flex justify-between items-center">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  You have {solBalance.toFixed(4)} SOL. You need at least {REQUIRED_SOL_AMOUNT} SOL to vote.
                </span>
              </div>
            </div>
          )}

          {voteError && (
            <div className="bg-red-900/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm mt-2">
              {voteError}
            </div>
          )}
        </div>
      )}

      {!publicKey && isActive && (
        <div className="bg-[#2c5446] text-[#F5F5DC]/70 p-3 mb-4 rounded-lg text-sm">
          Connect your wallet to vote for a candidate
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {candidates.map((candidate, index) => {
          const candidateName = candidate.account.candidateName
          const voteCount = Number(candidate.account.candidateVotes)
          const votePercentage = totalVotes > 0
            ? Math.round((voteCount / totalVotes) * 100)
            : 0

          const canVote = isActive && publicKey && (!voteError) && (solBalance !== null && hasEnoughSol)
          const isVoting = votingFor === candidateName

          return (
            <div key={index} className="border border-[#2c5446] rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-medium text-[#F5F5DC]">{candidateName}</h4>
                <div className="flex items-center gap-2">
                  {isActive && (
                    <button
                      onClick={() => handleVoteClick(candidateName)}
                      className="px-4 py-2 bg-white text-[#0A1A14] text-sm font-medium rounded-lg hover:bg-[#A3E4D7] hover:text-[#0A1A14] transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!canVote || vote.isPending || isVoting}
                      title={!publicKey
                        ? 'Connect your wallet to vote'
                        : !isActive
                        ? 'Poll is not active'
                        : voteError
                        ? 'Voting failed'
                        : ''}
                    >
                      {isVoting ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-[#0A1A14] rounded-full"></div>
                          <span>Voting...</span>
                        </div>
                      ) : (
                        'Vote'
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2 w-full bg-[#2c5446] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#A3E4D7] transition-all duration-300"
                    style={{ width: `${votePercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-[#F5F5DC]">
                  <span>{voteCount} votes</span>
                  <span>{votePercentage}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-[#2c5446]">
        <div className="flex justify-between text-sm font-medium text-[#F5F5DC] mb-2">
          <span>Total Votes</span>
          <span>{totalVotes}</span>
        </div>
      </div>
    </div>
    </>
  )
}

// Component to display a poll with its candidates
export function PollCard({ poll, publicKey, onUpdate, isHidden = false, defaultExpanded = false }: { poll: any; publicKey: PublicKey; onUpdate: () => void; isHidden?: boolean; defaultExpanded?: boolean }) {
  const { publicKey: walletPublicKey } = useWallet()
  const { getPollCandidates, hidePoll, setPollActive, isPollActive, isUserAdmin, closePollEarly } = useVotingProgram()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [candidates, setCandidates] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isVoting, setIsVoting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Check if the current user is an admin (the creator of the poll)
  useEffect(() => {
    setIsAdmin(isUserAdmin(poll.creator))
  }, [poll.creator, isUserAdmin])

  // Check if the poll is active
  useEffect(() => {
    const now = Date.now() / 1000
    const startTime = poll.pollStart.toNumber()
    const endTime = poll.pollEnd.toNumber()
    setIsActive(now >= startTime && now <= endTime)
  }, [poll.pollStart, poll.pollEnd])

  // Load candidates when expanded
  useEffect(() => {
    const loadCandidates = async () => {
      setIsLoading(true)
      try {
        const candidatesData = await getPollCandidates(poll.pollId.toNumber())
        setCandidates(candidatesData)
      } catch (error) {
        console.error('Error loading candidates:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (isExpanded) {
      loadCandidates()
    }
  }, [isExpanded, poll.pollId])

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const handleDeletePoll = () => {
    // This would require a new function in the Anchor program
    // For now, we'll just hide the poll locally
    hidePoll(poll.pollId.toNumber())
    onUpdate()
  }

  const handleToggleActive = () => {
    setPollActive(poll.pollId.toNumber(), !isActive)
    setIsActive(!isActive)
    onUpdate()
  }

  const handleClosePollEarly = async () => {
    try {
      await closePollEarly.mutateAsync({ pollId: poll.pollId.toNumber() })
      setShowCloseConfirm(false)
      onUpdate()
    } catch (error) {
      console.error('Error closing poll:', error)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const isPollEnded = () => {
    const now = Math.floor(Date.now() / 1000)
    return now > poll.pollEnd.toNumber()
  }

  const getTimeRemaining = (startTime: number, endTime: number) => {
    const now = Math.floor(Date.now() / 1000)

    // Check if poll has ended
    if (now > endTime) {
      return 'Ended - View results'
    }

    // Check if poll hasn't started yet
    if (now < startTime) {
      const timeUntilStart = startTime - now
      const days = Math.floor(timeUntilStart / 86400)
      const hours = Math.floor((timeUntilStart % 86400) / 3600)
      const minutes = Math.floor((timeUntilStart % 3600) / 60)

      if (days > 0) {
        return `Starting in ${days}d ${hours}h`
      } else if (hours > 0) {
        return `Starting in ${hours}h ${minutes}m`
      } else {
        return `Starting in ${minutes}m`
      }
    }

    // Poll is active, show time remaining until end
    const timeRemaining = endTime - now
    const days = Math.floor(timeRemaining / 86400)
    const hours = Math.floor((timeRemaining % 86400) / 3600)
    const minutes = Math.floor((timeRemaining % 3600) / 60)

    if (days > 0) {
      return `Poll ending in ${days}d ${hours}h`
    } else if (hours > 0) {
      return `Poll ending in ${hours}h ${minutes}m`
    } else {
      return `Poll ending in ${minutes}m`
    }
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

  // Candidate summary string
  const candidateSummary = candidates.length > 0
    ? candidates.map(c => c.account.candidateName).join(' vs ')
    : 'No candidates yet'

  // Prevent card click from toggling when clicking on action buttons
  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation()

  // Default image for all polls
  const defaultImage = 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80'

  const totalVotes = candidates.reduce((sum, c) => sum + Number(c.account.candidateVotes), 0)

  return (
    <>
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

      {/* Close Poll Confirmation */}
      <ConfirmationModal
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={handleClosePollEarly}
        isLoading={closePollEarly.isPending}
        title="Close Poll Early?"
        message={
          <div className="space-y-2">
            <p>Are you sure you want to close this poll now?</p>
            <p className="text-sm text-[#F5F5DC]/70">
              This will immediately end voting and finalize the results. This action cannot be undone.
            </p>
          </div>
        }
        confirmText="Close Poll"
        cancelText="Cancel"
        confirmButtonClass="bg-red-500 text-white hover:bg-red-600"
      />

    <div
      className={`rounded-xl shadow-lg overflow-hidden border border-[#F5F5DC]/20 mb-2 ${isExpanded ? '' : 'cursor-pointer hover:shadow-2xl transition-shadow'}`}
      onClick={() => !isExpanded && setIsExpanded(true)}
      style={!isExpanded ? {
        backgroundImage: `url(${defaultImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        minHeight: 180,
        color: 'white',
      } : {}}
    >
      {!isExpanded && (
        <>
          {/* Overlay */}
          <div style={{position: 'absolute', inset: 0, background: 'rgba(44, 84, 70, 0.65)', zIndex: 1}} />
          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between h-full" style={{minHeight: 180}}>
            <div className="p-4">
              <h3 className="text-lg font-bold drop-shadow">{poll.description || 'Untitled Poll'}</h3>
              <div className="text-sm opacity-80 drop-shadow">{poll.subtitle || 'Nationwide'}</div>
            </div>
            <div className="flex items-center justify-between px-4 py-4" style={{background: '#7ed6c1', borderBottomLeftRadius: 12, borderBottomRightRadius: 12}}>
              <div className="flex items-center gap-2 text-xs text-[#2c5446]">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Voting closes in {getTimeRemaining(poll.pollStart.toNumber(), poll.pollEnd.toNumber()).replace('Poll ending in ', '')}
              </div>
              <div className="flex items-center gap-2 text-xs text-[#2c5446]">
                <svg className="w-4 h-4 mr-1" fill="#2c5446" stroke="#2c5446" viewBox="0 0 24 24" ><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h1v10a1 1 0 001 1h14a1 1 0 001-1V10h1" /></svg>
                {candidates.reduce((sum, c) => sum + Number(c.account.candidateVotes), 0).toLocaleString()} votes
              </div>
            </div>
          </div>
        </>
      )}
      {isExpanded && (
        <div
          className="bg-[#3a6b5a] relative"
          style={{
            backgroundImage: `url(${defaultImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: 180,
          }}
        >
          {/* Green overlay for readability */}
          <div style={{position: 'absolute', inset: 0, background: 'rgba(44, 84, 70, 0.75)', zIndex: 1}} />
          {/* Expanded content on top of image/overlay */}
          <div className="relative z-10">
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-[#F5F5DC]">Poll #{poll.pollId.toString()}</h3>
                  <p className="text-sm text-[#F5F5DC]/80 mt-1">{poll.description}</p>
                  <div className="flex items-center mt-2 text-xs text-[#F5F5DC]/60">
                    <span>Start: {formatDate(poll.pollStart.toNumber())}</span>
                    <span className="mx-2">•</span>
                    <span>End: {formatDate(poll.pollEnd.toNumber())}</span>
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#2c5446] text-[#A3E4D7]">
                      {getTimeRemaining(poll.pollStart.toNumber(), poll.pollEnd.toNumber())}
                    </span>
                  </div>
                  {/* Candidate summary always visible */}
                  <div className="mt-2 text-sm text-[#A3E4D7] font-semibold truncate">
                    {candidateSummary}
                  </div>
                </div>
                <div className="flex flex-col space-y-2 ml-4">
                  {isAdmin && (
                    <>
                      <button
                        onClick={e => { stopPropagation(e); handleToggleActive(); }}
                        className={`p-1 rounded-full ${
                          isActive ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                        }`}
                        title={isActive ? 'Deactivate Poll' : 'Activate Poll'}
                      >
                        {isActive ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={e => { stopPropagation(e); handleDeletePoll(); }}
                        className="p-1 rounded-full bg-red-900/30 text-red-400 hover:bg-red-900/50"
                        title="Delete Poll"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                  <button
                    onClick={e => { stopPropagation(e); handleShare(); }}
                    className={`p-1 rounded-full ${isCopied ? 'bg-green-900/30 text-green-400' : 'bg-[#2c5446] text-[#F5F5DC] hover:bg-[#2c5446]/80'}`}
                    title="Share Poll"
                  >
                    {isCopied ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <rect x="9" y="9" width="13" height="13" rx="2" fill="currentColor" stroke="green" strokeWidth="2" />
                        <rect x="3" y="3" width="13" height="13" rx="2" fill="currentColor" stroke="green" strokeWidth="2" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={e => { stopPropagation(e); handleToggleExpand(); }}
                    className="p-1 rounded-full bg-[#2c5446] text-[#F5F5DC] hover:bg-[#2c5446]/80"
                  >
                    {isExpanded ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {/* VotingSection and horizontal line */}
              <div className="mt-4 pt-4">
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-[#F5F5DC] mb-2">Poll Details</h4>
                  <p className="text-xs text-[#F5F5DC]/70 mb-1">
                    <span className="font-medium">Address:</span>{' '}
                    <ExplorerLink path={`account/${publicKey}`} label={ellipsify(publicKey.toString())} />
                  </p>
                  <p className="text-xs text-[#F5F5DC]/70">
                    <span className="font-medium">Candidates:</span> {poll.candidateAmount.toString()}
                  </p>
                </div>

                {isLoading ? (
                  <div className="flex justify-center my-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#A3E4D7]"></div>
                  </div>
                ) : candidates.length > 0 ? (
                  <>
                    <VotingSection pollId={poll.pollId.toNumber()} pollDescription={poll.description} candidates={candidates} isActive={isActive} onUpdate={() => {}} />

                    {/* Admin Actions */}
                    {isAdmin && !isPollEnded() && (
                      <div className="mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowCloseConfirm(true)
                          }}
                          className="w-full px-4 py-3 bg-red-500/20 border-2 border-red-500 text-red-400 text-sm font-medium rounded-lg hover:bg-red-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Close Poll Early
                        </button>
                      </div>
                    )}

                    {/* View Results Button for ended polls */}
                    {isPollEnded() && (
                      <div className="mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowResults(true)
                          }}
                          className="w-full px-4 py-3 bg-[#A3E4D7] text-[#0A1A14] text-sm font-bold rounded-lg hover:bg-[#A3E4D7]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] flex items-center justify-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          View Final Results & Share
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-[#F5F5DC]/70">No candidates found for this poll.</p>
                    {!isActive && (
                      <p className="text-sm text-red-400 mt-2">
                        Cannot add candidates after poll has ended.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A3E4D7]"></div>
      </div>
    )
  }

  if (polls.error) {
    console.error('Error loading polls:', polls.error)
    return (
      <div className="bg-red-900/20 text-red-400 rounded-lg p-4 text-sm border border-red-500/20">
        Error loading polls. Please try again.
      </div>
    )
  }

  if (!polls.data || polls.data.length === 0) {
    return (
      <div className="bg-[#2c5446] text-[#F5F5DC] rounded-lg p-4 text-sm border border-[#F5F5DC]/20">
        No polls found. Create one to get started!
      </div>
    )
  }

  console.log('All polls:', polls.data)
  console.log('Current filter:', filter)

  // Filter polls based on the selected filter
  const filteredPolls = polls.data.filter(poll => {
    const now = Math.floor(Date.now() / 1000)

    // Make sure we're accessing the correct properties
    const pollData = poll.account
    console.log('Poll data:', pollData)

    // Check if pollStart and pollEnd exist and are valid
    if (!pollData.pollStart || !pollData.pollEnd) {
      console.error('Poll missing start or end time:', pollData)
      return false
    }

    const startTime = pollData.pollStart.toNumber()
    const endTime = pollData.pollEnd.toNumber()

    console.log('Poll:', pollData.description || 'Untitled', 'Start:', startTime, 'End:', endTime, 'Now:', now)

    let isIncluded = false
    switch (filter) {
      case 'active':
        // For active polls, include those that are currently within their time window
        isIncluded = now >= startTime && now <= endTime
        break
      case 'future':
        // For future polls, include those that haven't started yet
        isIncluded = now < startTime
        break
      case 'past':
        // For past polls, include those that have ended
        isIncluded = now > endTime
        break
      default:
        isIncluded = true
    }

    console.log('Is included:', isIncluded)
    return isIncluded
  })

  console.log('Filtered polls:', filteredPolls)

  return (
    <div className="space-y-2">
      {filteredPolls.map((pollAccount) => (
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