'use client'

import { Keypair, PublicKey } from '@solana/web3.js'
import { useMemo } from 'react'
import { ellipsify } from '../ui/ui-layout'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useVotingapplicationProgram, useVotingapplicationProgramAccount } from './votingapplication-data-access'

export function VotingapplicationCreate() {
  // const { initialize } = useVotingapplicationProgram();
  const { program } = useVotingapplicationProgram();

  return (
    <button
      className="px-4 py-2 bg-accent text-background font-bold text-sm uppercase tracking-wide border-2 border-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={true}
      title="This function is not implemented yet"
    >
      Create Poll
    </button>
  )
}

export function VotingapplicationList() {
  const { polls, getProgramAccount } = useVotingapplicationProgram()

  if (getProgramAccount.isLoading) {
    return (
      <div className="flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="bg-blue-500/10 border-2 border-blue-500/40 p-4 text-center">
        <span className="text-foreground">Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }
  return (
    <div className={'space-y-6'}>
      {polls.isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        </div>
      ) : polls.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {polls.data?.map((account: any) => (
            <VotingapplicationCard key={account.publicKey.toString()} account={account.publicKey} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={'text-2xl font-bold text-foreground'}>No accounts</h2>
          <p className="text-muted-foreground">No accounts found. Create one above to get started.</p>
        </div>
      )}
    </div>
  )
}

function VotingapplicationCard({ account }: { account: PublicKey }) {
  const { query } = useVotingapplicationProgramAccount({
    account,
  });

  const pollData = query.data;

  return query.isLoading ? (
    <div className="flex justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
    </div>
  ) : (
    <div className="bg-card border-2 border-border">
      <div className="p-6 text-center">
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-foreground cursor-pointer hover:text-accent" onClick={() => query.refetch()}>
            Poll #{pollData?.pollId.toString() || 'Unknown'}
          </h2>
          <p className="text-muted-foreground">{pollData?.description || 'No description'}</p>

          <div className="text-center space-y-4">
            <p>
              <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
            </p>
            <p className="text-sm text-muted-foreground">Candidates: {pollData?.candidateAmount.toString() || '0'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
