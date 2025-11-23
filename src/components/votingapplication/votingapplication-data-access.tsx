'use client'

import { getVotingapplicationProgram, getVotingapplicationProgramId } from '@project/anchor'
import { Cluster, Keypair, PublicKey, Connection } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { usePrivyAnchorProvider } from '../solana/privy-anchor-provider'
import { useTransactionToast } from '../ui/ui-layout'

export function useVotingapplicationProgram() {
  const { cluster } = useCluster()
  const connection = useMemo(() => new Connection(cluster.endpoint, 'confirmed'), [cluster.endpoint])
  const transactionToast = useTransactionToast()
  const provider = usePrivyAnchorProvider()
  const programId = useMemo(() => getVotingapplicationProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getVotingapplicationProgram(provider, programId), [provider, programId])

  const polls = useQuery({
    queryKey: ['votingapplication', 'polls', { cluster }],
    queryFn: () => program.account.poll.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  // This method doesn't exist in the IDL
  /* 
  const initialize = useMutation({
    mutationKey: ['votingapplication', 'initialize', { cluster }],
    mutationFn: (keypair: Keypair) =>
      program.methods.initialize().accounts({ votingapplication: keypair.publicKey }).signers([keypair]).rpc(),
    onSuccess: (signature) => {
      transactionToast(signature)
      return polls.refetch()
    },
    onError: () => toast.error('Failed to initialize account'),
  })
  */

  return {
    program,
    programId,
    polls,
    getProgramAccount,
    // initialize,
  }
}

export function useVotingapplicationProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const { program } = useVotingapplicationProgram()

  const query = useQuery({
    queryKey: ['votingapplication', 'account', { cluster, account }],
    queryFn: () => program.account.poll.fetch(account),
  })

  /* These methods don't exist in the IDL
  const closeMutation = useMutation({
    mutationKey: ['votingapplication', 'close', { cluster, account }],
    mutationFn: () => program.methods.close().accounts({ votingapplication: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return query.refetch()
    },
  })

  const decrementMutation = useMutation({
    mutationKey: ['votingapplication', 'decrement', { cluster, account }],
    mutationFn: () => program.methods.decrement().accounts({ votingapplication: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return query.refetch()
    },
  })

  const incrementMutation = useMutation({
    mutationKey: ['votingapplication', 'increment', { cluster, account }],
    mutationFn: () => program.methods.increment().accounts({ votingapplication: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return query.refetch()
    },
  })

  const setMutation = useMutation({
    mutationKey: ['votingapplication', 'set', { cluster, account }],
    mutationFn: (value: number) => program.methods.set(value).accounts({ votingapplication: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return query.refetch()
    },
  })
  */

  return {
    query,
    /* 
    closeMutation,
    decrementMutation,
    incrementMutation,
    setMutation,
    */
  }
}
