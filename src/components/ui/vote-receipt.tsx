'use client'

import { useRef } from 'react'
import { toast } from 'react-hot-toast'

interface VoteReceiptProps {
  isOpen: boolean
  onClose: () => void
  candidateName: string
  pollDescription: string
  pollId: number
  transactionSignature?: string
}

export function VoteReceipt({
  isOpen,
  onClose,
  candidateName,
  pollDescription,
  pollId,
  transactionSignature
}: VoteReceiptProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  const handleDownload = async () => {
    if (!cardRef.current) return

    try {
      // Use html2canvas library if available, otherwise use a simpler screenshot approach
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#2c5446',
        scale: 2,
      })

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `vote-receipt-${pollId}-${Date.now()}.png`
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
        toast.success('Receipt downloaded!')
      })
    } catch (error) {
      console.error('Error downloading receipt:', error)
      toast.error('Failed to download receipt')
    }
  }

  const handleShare = () => {
    const text = `I just voted for ${candidateName} in "${pollDescription}" on Utopia - the decentralized voting platform! 🗳️ #Utopia #Web3 #Voting`

    if (navigator.share) {
      navigator.share({
        title: 'I Voted!',
        text: text,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(text)
        toast.success('Share text copied to clipboard!')
      })
    } else {
      navigator.clipboard.writeText(text)
      toast.success('Share text copied to clipboard!')
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
        <div className="relative bg-[#2c5446] rounded-xl border-2 border-[#A3E4D7] shadow-2xl max-w-lg w-full p-6 transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#F5F5DC]/70 hover:text-[#F5F5DC] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Receipt Card */}
          <div
            ref={cardRef}
            className="bg-gradient-to-br from-[#3a6b5a] to-[#2c5446] rounded-xl p-8 border-2 border-[#A3E4D7]"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#A3E4D7] rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#0A1A14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-[#F5F5DC] mb-2">I Voted! 🗳️</h2>
              <p className="text-sm text-[#F5F5DC]/70">Your voice matters</p>
            </div>

            {/* Vote Details */}
            <div className="bg-[#2c5446]/50 rounded-lg p-6 mb-6 border border-[#A3E4D7]/20">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[#F5F5DC]/60 uppercase tracking-wide mb-1">Voted For</p>
                  <p className="text-2xl font-bold text-[#A3E4D7]">{candidateName}</p>
                </div>

                <div className="pt-4 border-t border-[#F5F5DC]/10">
                  <p className="text-xs text-[#F5F5DC]/60 uppercase tracking-wide mb-1">Poll</p>
                  <p className="text-sm text-[#F5F5DC] line-clamp-2">{pollDescription}</p>
                </div>

                <div className="pt-4 border-t border-[#F5F5DC]/10">
                  <p className="text-xs text-[#F5F5DC]/60 uppercase tracking-wide mb-1">Date</p>
                  <p className="text-sm text-[#F5F5DC]">{new Date().toLocaleString()}</p>
                </div>

                {transactionSignature && (
                  <div className="pt-4 border-t border-[#F5F5DC]/10">
                    <p className="text-xs text-[#F5F5DC]/60 uppercase tracking-wide mb-1">Blockchain Proof</p>
                    <p className="text-xs text-[#F5F5DC] font-mono truncate">{transactionSignature}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="text-xs text-[#F5F5DC]/50 mb-2">Powered by Utopia</p>
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
              Share
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
