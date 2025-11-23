'use client'

import { useVotingProgram } from '@/components/voting/voting-data-access'
import { PollCard } from '@/components/voting/voting-ui'
import { useParams } from 'next/navigation'

export default function PollPage() {
  const { id } = useParams()
  const { polls } = useVotingProgram()

  if (polls.isLoading) {
    return (
      <div className="min-h-screen bg-[#2c5446] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A3E4D7]"></div>
      </div>
    )
  }

  if (polls.error) {
    return (
      <div className="min-h-screen bg-[#2c5446] flex items-center justify-center">
        <div className="bg-red-900/20 text-red-400 rounded-lg p-4 text-sm border border-red-500/20">
          Error loading poll. Please try again.
        </div>
      </div>
    )
  }

  const poll = polls.data?.find((p: any) => p.account.pollId.toString() === id)

  if (!poll) {
    return (
      <div className="min-h-screen bg-[#2c5446] flex items-center justify-center">
        <div className="bg-[#2c5446] text-[#F5F5DC] rounded-lg p-4 text-sm border border-[#F5F5DC]/20">
          Poll not found
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#2c5446] py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <PollCard
          poll={poll.account}
          publicKey={poll.publicKey}
          onUpdate={() => polls.refetch()}
          defaultExpanded={true}
        />
      </div>
    </div>
  )
} 