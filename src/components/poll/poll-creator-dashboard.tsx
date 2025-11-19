'use client'

import { useState, useEffect } from 'react'
import { useVotingProgram } from '../voting/voting-data-access'
import { PublicKey } from '@solana/web3.js'
import { PollResultsCard } from '../ui/poll-results-card'
import { ConfirmationModal } from '../ui/confirmation-modal'

interface PollAnalytics {
  pollId: number
  description: string
  totalVotes: number
  candidateCount: number
  status: 'upcoming' | 'active' | 'ended'
  startTime: Date
  endTime: Date
  timeRemaining?: string
  candidates: Array<{ name: string; votes: number }>
}

export function PollCreatorDashboard() {
  const { polls, getPollCandidates, closePollEarly, isUserAdmin } = useVotingProgram()
  const [myPolls, setMyPolls] = useState<PollAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPollResults, setSelectedPollResults] = useState<PollAnalytics | null>(null)
  const [showConfirmClose, setShowConfirmClose] = useState<number | null>(null)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    async function loadMyPolls() {
      if (!polls.data) return

      setLoading(true)
      const pollAnalytics: PollAnalytics[] = []

      for (const pollAccount of polls.data) {
        const poll = pollAccount.account

        // Only include polls created by the current user
        if (!isUserAdmin(poll.pollAdmin)) continue

        const candidates = await getPollCandidates(poll.pollId.toNumber())
        const totalVotes = candidates.reduce((sum, c) => sum + c.account.candidateVotes.toNumber(), 0)

        const now = Math.floor(Date.now() / 1000)
        const startTime = poll.pollStart.toNumber()
        const endTime = poll.pollEnd.toNumber()

        let status: 'upcoming' | 'active' | 'ended' = 'upcoming'
        let timeRemaining: string | undefined

        if (now >= endTime) {
          status = 'ended'
        } else if (now >= startTime) {
          status = 'active'
          const remainingSeconds = endTime - now
          timeRemaining = formatTimeRemaining(remainingSeconds)
        } else {
          const secondsUntilStart = startTime - now
          timeRemaining = `Starts in ${formatTimeRemaining(secondsUntilStart)}`
        }

        pollAnalytics.push({
          pollId: poll.pollId.toNumber(),
          description: poll.description,
          totalVotes,
          candidateCount: candidates.length,
          status,
          startTime: new Date(startTime * 1000),
          endTime: new Date(endTime * 1000),
          timeRemaining,
          candidates: candidates.map(c => ({
            name: c.account.candidateName,
            votes: c.account.candidateVotes.toNumber()
          }))
        })
      }

      // Sort by most recent first
      pollAnalytics.sort((a, b) => b.pollId - a.pollId)
      setMyPolls(pollAnalytics)
      setLoading(false)
    }

    loadMyPolls()
  }, [polls.data])

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
  }

  const handleClosePoll = async (pollId: number) => {
    setIsClosing(true)
    try {
      await closePollEarly.mutateAsync({ pollId })
      setShowConfirmClose(null)
      // Refresh polls after closing
      setTimeout(() => {
        polls.refetch()
      }, 2000)
    } catch (error) {
      console.error('Error closing poll:', error)
    } finally {
      setIsClosing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-[#F5F5DC]">Loading your polls...</div>
      </div>
    )
  }

  if (myPolls.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#A3E4D7]/10 rounded-full mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#A3E4D7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-[#F5F5DC] mb-2">No Polls Created Yet</h3>
        <p className="text-[#F5F5DC]/70 mb-4">Create your first poll to see analytics and manage it here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#2c5446] border-2 border-[#A3E4D7]/30 rounded-lg p-6">
          <div className="text-[#F5F5DC]/70 text-sm mb-1">Total Polls</div>
          <div className="text-3xl font-bold text-[#A3E4D7]">{myPolls.length}</div>
        </div>
        <div className="bg-[#2c5446] border-2 border-[#A3E4D7]/30 rounded-lg p-6">
          <div className="text-[#F5F5DC]/70 text-sm mb-1">Active Polls</div>
          <div className="text-3xl font-bold text-[#A3E4D7]">
            {myPolls.filter(p => p.status === 'active').length}
          </div>
        </div>
        <div className="bg-[#2c5446] border-2 border-[#A3E4D7]/30 rounded-lg p-6">
          <div className="text-[#F5F5DC]/70 text-sm mb-1">Total Votes</div>
          <div className="text-3xl font-bold text-[#A3E4D7]">
            {myPolls.reduce((sum, p) => sum + p.totalVotes, 0)}
          </div>
        </div>
      </div>

      {/* Polls List */}
      <div className="space-y-4">
        {myPolls.map((poll) => (
          <div
            key={poll.pollId}
            className="bg-[#2c5446] border-2 border-[#A3E4D7]/30 rounded-lg p-6 hover:border-[#A3E4D7]/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-[#F5F5DC]">Poll #{poll.pollId}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      poll.status === 'active'
                        ? 'bg-green-900/30 text-green-400 border border-green-600/40'
                        : poll.status === 'ended'
                        ? 'bg-red-900/30 text-red-400 border border-red-600/40'
                        : 'bg-blue-900/30 text-blue-400 border border-blue-600/40'
                    }`}
                  >
                    {poll.status === 'active' ? '● Active' : poll.status === 'ended' ? 'Ended' : 'Upcoming'}
                  </span>
                </div>
                <p className="text-[#F5F5DC]/70 text-sm mb-3">{poll.description}</p>
                <div className="flex items-center gap-4 text-sm text-[#F5F5DC]/60">
                  <span>📊 {poll.totalVotes} votes</span>
                  <span>👥 {poll.candidateCount} candidates</span>
                  {poll.timeRemaining && <span>⏱️ {poll.timeRemaining}</span>}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            {poll.totalVotes > 0 && (
              <div className="mb-4">
                <div className="text-xs text-[#F5F5DC]/50 mb-2 uppercase tracking-wide">Top Candidate</div>
                {(() => {
                  const topCandidate = [...poll.candidates].sort((a, b) => b.votes - a.votes)[0]
                  const percentage = poll.totalVotes > 0 ? Math.round((topCandidate.votes / poll.totalVotes) * 100) : 0
                  return (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-[#2c5446] rounded-lg overflow-hidden border border-[#A3E4D7]/10">
                        <div
                          className="bg-[#A3E4D7] h-6 flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${percentage}%` }}
                        >
                          {percentage > 15 && (
                            <span className="text-xs font-bold text-[#0A1A14]">{percentage}%</span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-[#F5F5DC]">
                        {topCandidate.name} ({topCandidate.votes})
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-[#A3E4D7]/10">
              <button
                onClick={() => setSelectedPollResults(poll)}
                className="px-4 py-2 bg-[#A3E4D7]/10 border border-[#A3E4D7] text-[#A3E4D7] text-sm font-medium rounded-lg hover:bg-[#A3E4D7]/20 transition-colors"
              >
                View Results
              </button>
              {poll.status === 'active' && (
                <button
                  onClick={() => setShowConfirmClose(poll.pollId)}
                  className="px-4 py-2 bg-red-900/20 border border-red-600/40 text-red-400 text-sm font-medium rounded-lg hover:bg-red-900/30 transition-colors"
                >
                  Close Early
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Results Modal */}
      {selectedPollResults && (
        <PollResultsCard
          isOpen={true}
          onClose={() => setSelectedPollResults(null)}
          pollId={selectedPollResults.pollId}
          pollDescription={selectedPollResults.description}
          candidates={selectedPollResults.candidates}
          totalVotes={selectedPollResults.totalVotes}
        />
      )}

      {/* Close Confirmation Modal */}
      {showConfirmClose !== null && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setShowConfirmClose(null)}
          onConfirm={() => handleClosePoll(showConfirmClose)}
          title="Close Poll Early"
          message="Are you sure you want to close this poll? This action cannot be undone and will end voting immediately."
          confirmText="Close Poll"
          cancelText="Cancel"
          confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
          isLoading={isClosing}
        />
      )}
    </div>
  )
}
