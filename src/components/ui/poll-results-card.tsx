'use client'

import { useRef } from 'react'
import { toast } from 'react-hot-toast'

interface Candidate {
  name: string
  votes: number
}

interface PollResultsCardProps {
  isOpen: boolean
  onClose: () => void
  pollId: number
  pollDescription: string
  candidates: Candidate[]
  totalVotes: number
}

export function PollResultsCard({
  isOpen,
  onClose,
  pollId,
  pollDescription,
  candidates,
  totalVotes
}: PollResultsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  // Sort candidates by votes (descending)
  const sortedCandidates = [...candidates].sort((a, b) => b.votes - a.votes)
  const winner = sortedCandidates[0]
  const maxVotes = Math.max(...candidates.map(c => c.votes), 1)

  const handleDownload = async () => {
    if (!cardRef.current) return

    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#2c5446',
        scale: 2,
      })

      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `poll-results-${pollId}-${Date.now()}.png`
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Results downloaded!')
      })
    } catch (error) {
      console.error('Error downloading results:', error)
      toast.error('Failed to download results')
    }
  }

  const handleShare = () => {
    const winnerText = winner.votes > 0
      ? `${winner.name} won with ${winner.votes} votes (${Math.round((winner.votes / totalVotes) * 100)}%)`
      : 'No votes cast'

    const text = `Poll Results: "${pollDescription}"\n${winnerText}\n\nView on Utopia - Decentralized Voting! 🗳️ #Utopia #Web3`

    if (navigator.share) {
      navigator.share({
        title: 'Poll Results',
        text: text,
      }).catch(() => {
        navigator.clipboard.writeText(text)
        toast.success('Results copied to clipboard!')
      })
    } else {
      navigator.clipboard.writeText(text)
      toast.success('Results copied to clipboard!')
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/70 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-[#2c5446] rounded-xl border-2 border-[#A3E4D7] shadow-2xl max-w-2xl w-full p-6 transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#F5F5DC]/70 hover:text-[#F5F5DC] transition-colors z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Results Card */}
          <div
            ref={cardRef}
            className="bg-gradient-to-br from-[#3a6b5a] to-[#2c5446] rounded-xl p-8 border-2 border-[#A3E4D7]"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#A3E4D7] rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#0A1A14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-[#F5F5DC] mb-2">Final Results</h2>
              <p className="text-sm text-[#F5F5DC]/70 line-clamp-2">{pollDescription}</p>
            </div>

            {/* Winner Announcement */}
            {totalVotes > 0 && (
              <div className="bg-[#A3E4D7]/10 border-2 border-[#A3E4D7] rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <div className="text-center">
                    <p className="text-xs text-[#F5F5DC]/60 uppercase tracking-wide">Winner</p>
                    <p className="text-2xl font-bold text-[#A3E4D7]">{winner.name}</p>
                    <p className="text-sm text-[#F5F5DC]/80">
                      {winner.votes} votes ({Math.round((winner.votes / totalVotes) * 100)}%)
                    </p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </div>
              </div>
            )}

            {/* Vote Graph */}
            <div className="bg-[#2c5446]/50 rounded-lg p-6 mb-6 border border-[#A3E4D7]/20">
              <h3 className="text-sm font-medium text-[#F5F5DC] mb-4 uppercase tracking-wide">Vote Breakdown</h3>
              <div className="space-y-4">
                {sortedCandidates.map((candidate, index) => {
                  const percentage = totalVotes > 0 ? Math.round((candidate.votes / totalVotes) * 100) : 0
                  const barWidth = totalVotes > 0 ? (candidate.votes / maxVotes) * 100 : 0

                  return (
                    <div key={index}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          {index === 0 && totalVotes > 0 && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                          )}
                          <span className="text-sm font-medium text-[#F5F5DC]">{candidate.name}</span>
                        </div>
                        <span className="text-sm text-[#F5F5DC]/70">{candidate.votes} votes ({percentage}%)</span>
                      </div>
                      <div className="h-8 w-full bg-[#2c5446] rounded-lg overflow-hidden relative">
                        <div
                          className={`h-full ${index === 0 ? 'bg-[#A3E4D7]' : 'bg-[#5a8a75]'} transition-all duration-500 flex items-center justify-end pr-2`}
                          style={{ width: `${barWidth}%` }}
                        >
                          {barWidth > 15 && (
                            <span className="text-xs font-bold text-[#0A1A14]">{percentage}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Total Votes */}
              <div className="mt-6 pt-4 border-t border-[#F5F5DC]/10">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-[#F5F5DC]">Total Votes Cast</span>
                  <span className="text-lg font-bold text-[#A3E4D7]">{totalVotes}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="text-xs text-[#F5F5DC]/50 mb-1">Poll #{pollId}</p>
              <p className="text-xs text-[#F5F5DC]/50 mb-1">Powered by Utopia</p>
              <p className="text-xs text-[#F5F5DC]/40">Decentralized Voting on Solana</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleShare}
              className="flex-1 px-4 py-3 bg-transparent border-2 border-[#A3E4D7] text-[#A3E4D7] text-sm font-medium rounded-lg hover:bg-[#A3E4D7]/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Results
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 px-4 py-3 bg-[#A3E4D7] text-[#0A1A14] text-sm font-medium rounded-lg hover:bg-[#A3E4D7]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
