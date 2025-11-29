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
      className="btn btn-xs lg:btn-md btn-primary"
      // onClick={() => initialize.mutateAsync(Keypair.generate())}
      // disabled={initialize.isPending}
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
    return <span className="loading loading-spinner loading-lg"></span>
  }
  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }
  return (
    <div className={'space-y-6'}>
      {polls.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : polls.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {polls.data?.map((account: any) => (
            <VotingapplicationCard key={account.publicKey.toString()} account={account.publicKey} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className={'text-2xl'}>No accounts</h2>
          No accounts found. Create one above to get started.
        </div>
      )}
    </div>
  )
}

function VotingapplicationCard({ account }: { account: PublicKey }) {
  const { query } = useVotingapplicationProgramAccount({
    account,
  });

  // We no longer have these mutations as they were commented out
  /* const { accountQuery, incrementMutation, setMutation, decrementMutation, closeMutation } = useVotingapplicationProgramAccount({
    account,
  }) */

  // Use data from the poll instead
  const pollData = query.data;

  return query.isLoading ? (
    <span className="loading loading-spinner loading-lg"></span>
  ) : (
    <div className="card card-bordered border-base-300 border-4 text-neutral-content">
      <div className="card-body items-center text-center">
        <div className="space-y-6">
          <h2 className="card-title justify-center text-xl cursor-pointer" onClick={() => query.refetch()}>
            Poll #{pollData?.pollId.toString() || 'Unknown'}
          </h2>
          <p>{pollData?.description || 'No description'}</p>
          
          <div className="text-center space-y-4">
            <p>
              <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
            </p>
            <p>Candidates: {pollData?.candidateAmount.toString() || '0'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
