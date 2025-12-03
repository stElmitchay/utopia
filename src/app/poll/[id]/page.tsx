'use client'

import { useVotingProgram } from '@/components/voting/voting-data-access'
import { PollDetail } from '@/components/poll/poll-detail'
import { useParams } from 'next/navigation'

export default function PollPage() {
  const { id } = useParams()
  const { polls } = useVotingProgram()

  if (polls.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (polls.error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-red-900/20 text-red-400 p-4 text-sm border-2 border-red-500/20">
          Error loading poll. Please try again.
        </div>
      </div>
    )
  }

  const poll = polls.data?.find((p: any) => p.account.pollId.toString() === id)

  if (!poll) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card text-foreground p-8 text-center border-2 border-border">
          <p className="text-lg font-bold uppercase tracking-wide mb-2">Poll not found</p>
          <p className="text-sm text-muted-foreground font-mono">This poll does not exist or has been removed</p>
        </div>
      </div>
    )
  }

  return (
    <PollDetail
      poll={poll.account}
      publicKey={poll.publicKey}
      onUpdate={() => polls.refetch()}
    />
  )
} 