'use client'

import { getVotingapplicationProgram, getVotingapplicationProgramId } from '@project/anchor'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { BN } from '@coral-xyz/anchor'
import { Cluster, LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram, Connection } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { usePrivyAnchorProvider } from '../solana/privy-anchor-provider'
import { useTransactionToast } from '../ui/ui-layout'
import * as anchor from '@coral-xyz/anchor'

export function useVotingProgram() {
  const { cluster } = useCluster()
  const connection = useMemo(() => new Connection(cluster.endpoint, 'confirmed'), [cluster.endpoint])
  const transactionToast = useTransactionToast()
  const provider = usePrivyAnchorProvider()
  const { ready: walletsReady, wallets } = useWallets()

  const solanaWallet = useMemo(() => {
    console.log('[VotingDataAccess] Debug:', { walletsReady, walletsCount: wallets.length })
    if (!walletsReady || wallets.length === 0) {
      console.log('[VotingDataAccess] Wallet not ready yet')
      return null
    }
    console.log('[VotingDataAccess] Wallet found:', wallets[0])
    return wallets[0] // First wallet is the embedded Solana wallet
  }, [walletsReady, wallets])

  const programId = useMemo(() => {
    const id = getVotingapplicationProgramId(cluster.network as Cluster)
    console.log('Initializing program with ID:', id.toString())
    return id
  }, [cluster])

  const program = useMemo(() => {
    console.log('Creating program with provider:', provider.publicKey?.toString())
    const p = getVotingapplicationProgram(provider, programId)
    console.log('Program created successfully')
    return p
  }, [provider, programId])

  // Required SOL amount to vote (in SOL)
  const REQUIRED_SOL_AMOUNT = 1
  const [solBalance, setSolBalance] = useState<number>(0)
  const [hasEnoughSol, setHasEnoughSol] = useState<boolean>(false)

  // Utility function to clean up old localStorage entries
  const cleanupOldVotes = () => {
    try {
      const processedVotes = JSON.parse(localStorage.getItem('processedVotes') || '{}')
      const now = Date.now()
      const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000) // 7 days in milliseconds
      
      let hasChanges = false
      Object.keys(processedVotes).forEach(key => {
        if (processedVotes[key] < oneWeekAgo) {
          delete processedVotes[key]
          hasChanges = true
        }
      })
      
      if (hasChanges) {
        localStorage.setItem('processedVotes', JSON.stringify(processedVotes))
        console.log('Cleaned up old vote entries from localStorage')
      }
    } catch (error) {
      console.error('Error cleaning up old votes:', error)
    }
  }

  // Check SOL balance when wallet connects
  useEffect(() => {
    const checkBalance = async () => {
      if (solanaWallet?.address) {
        try {
          const publicKey = new PublicKey(solanaWallet.address)
          console.log('Checking SOL balance for wallet:', publicKey.toString())
          const lamports = await connection.getBalance(publicKey)
          const balance = lamports / LAMPORTS_PER_SOL
          console.log('SOL balance:', balance)
          setSolBalance(balance)
          setHasEnoughSol(balance >= REQUIRED_SOL_AMOUNT)
        } catch (error) {
          console.error('Error checking SOL balance:', error)
          setSolBalance(0)
          setHasEnoughSol(false)
        }
      }
    }

    checkBalance()
  }, [solanaWallet?.address, connection])

  // Function to get hidden polls from localStorage
  const getHiddenPolls = () => {
    const hiddenPolls = localStorage.getItem('hiddenPolls')
    return hiddenPolls ? JSON.parse(hiddenPolls) : []
  }

  // Function to get active polls from localStorage
  const getActivePolls = () => {
    const activePolls = localStorage.getItem('activePolls')
    return activePolls ? JSON.parse(activePolls) : []
  }

  // Function to hide a poll
  const hidePoll = (pollId: number) => {
    const hiddenPolls = getHiddenPolls()
    if (!hiddenPolls.includes(pollId)) {
      hiddenPolls.push(pollId)
      localStorage.setItem('hiddenPolls', JSON.stringify(hiddenPolls))
    }
  }

  // Function to unhide a poll
  const unhidePoll = (pollId: number) => {
    const hiddenPolls = getHiddenPolls()
    const updatedHiddenPolls = hiddenPolls.filter((id: number) => id !== pollId)
    localStorage.setItem('hiddenPolls', JSON.stringify(updatedHiddenPolls))
  }

  // Function to set a poll as active
  const setPollActive = (pollId: number, isActive: boolean) => {
    const activePolls = getActivePolls()
    if (isActive && !activePolls.includes(pollId)) {
      activePolls.push(pollId)
    } else if (!isActive) {
      const updatedActivePolls = activePolls.filter((id: number) => id !== pollId)
      localStorage.setItem('activePolls', JSON.stringify(updatedActivePolls))
      return
    }
    localStorage.setItem('activePolls', JSON.stringify(activePolls))
  }

  // Function to check if a poll is active
  const isPollActive = (pollId: number) => {
    const activePolls = getActivePolls()
    return activePolls.includes(pollId)
  }

  // Function to get all hidden polls
  const getHiddenPollsData = useQuery({
    queryKey: ['voting', 'hiddenPolls', { cluster }],
    queryFn: async () => {
      try {
        const accounts = await program.account.poll.all()
        const hiddenPolls = getHiddenPolls()
        return accounts.filter(account => hiddenPolls.includes(account.account.pollId.toNumber()))
      } catch (error) {
        console.error('Error fetching hidden polls:', error)
        return []
      }
    },
  })

  // Query all polls (excluding hidden ones)
  const polls = useQuery({
    queryKey: ['voting', 'polls', { cluster }],
    queryFn: async () => {
      try {
        console.log('Fetching polls...')
        const accounts = await program.account.poll.all()
        const hiddenPolls = getHiddenPolls()
        return accounts.filter(account => !hiddenPolls.includes(account.account.pollId.toNumber()))
      } catch (error) {
        console.error('Error fetching polls:', error)
        return []
      }
    },
    staleTime: Infinity, // Never consider the data stale
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch when component mounts
    refetchOnReconnect: false, // Don't refetch when reconnecting
  })

  // Function to manually refetch polls
  const refetchPolls = () => {
    console.log('Manually refetching polls...')
    polls.refetch()
  }

  // Initialize a new poll
  const initializePoll = useMutation({
    mutationKey: ['voting', 'initializePoll', { cluster }],
    mutationFn: async ({ pollId, description, pollStart, pollEnd }: { pollId: number, description: string, pollStart: number, pollEnd: number }) => {
      if (!solanaWallet?.address) throw new Error('Wallet not connected')

      const userPublicKey = new PublicKey(solanaWallet.address)
      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(new BN(pollId).toArray('le', 8))],
        programId
      )

      return program.methods
        .initializePoll(
          new BN(pollId),
          description,
          new BN(pollStart),
          new BN(pollEnd)
        )
        .accounts({
          signer: userPublicKey,
          poll: pollPda,
          systemProgram: anchor.web3.SystemProgram.programId
        } as any)
        .rpc()
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      toast.success('Poll created successfully!')
      refetchPolls() // Manually refetch after creating a new poll
    },
    onError: (error: any) => {
      console.error('Error creating poll:', error)
      if (error.message?.includes('already in use')) {
        toast.error('This poll ID is already taken. Please try a different ID.')
      } else {
        toast.error('Failed to create poll: ' + error.message)
      }
    },
  })

  // Initialize a new candidate for a poll
  const initializeCandidate = useMutation({
    mutationKey: ['voting', 'initializeCandidate', { cluster }],
    mutationFn: async ({ pollId, candidateName }: { pollId: number, candidateName: string }) => {
      if (!solanaWallet?.address) throw new Error('Wallet not connected')

      const userPublicKey = new PublicKey(solanaWallet.address)

      // Get poll account to check start time
      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(new BN(pollId).toArray('le', 8))],
        programId
      )

      const pollAccount = await program.account.poll.fetch(pollPda)
      const now = Math.floor(Date.now() / 1000)

      if (now >= pollAccount.pollStart.toNumber()) {
        throw new Error('Cannot add candidates after poll has started')
      }

      const [candidatePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(new BN(pollId).toArray('le', 8)),
          Buffer.from(candidateName)
        ],
        programId
      )

      // @ts-ignore - bypass TypeScript errors for account naming discrepancies
      return (program.methods as any)
        .initializeCandidate(
          candidateName,
          new BN(pollId)
        )
        .accounts({
          signer: userPublicKey,
          poll: pollPda,
          candidate: candidatePda,
          systemProgram: new PublicKey("11111111111111111111111111111111")
        })
        .rpc()
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      toast.success('Candidate added successfully!')
      return polls.refetch()
    },
    onError: (error: any) => {
      console.error(error)
      if (error.message?.includes('poll has started')) {
        toast.error('Cannot add candidates after poll has started')
      } else {
        toast.error('Failed to add candidate')
      }
    },
  })

  // Close poll early (admin only)
  const closePollEarly = useMutation({
    mutationKey: ['closePollEarly'],
    mutationFn: async ({ pollId }: { pollId: number }) => {
      if (!solanaWallet?.address) throw new Error('Wallet not connected')

      const userPublicKey = new PublicKey(solanaWallet.address)
      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(new BN(pollId).toArray('le', 8))],
        programId
      )

      return program.methods
        .closePollEarly(new BN(pollId))
        .accounts({
          signer: userPublicKey,
          poll: pollPda,
        })
        .rpc()
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      toast.success('Poll closed successfully!')
      return polls.refetch()
    },
    onError: (error: any) => {
      console.error('Error closing poll:', error)
      toast.error('Failed to close poll: ' + error.message)
    },
  })

  // Vote for a candidate with SOL balance check
  const vote = useMutation({
    mutationKey: ['vote'],
    mutationFn: async ({ pollId, candidateName }: { pollId: number; candidateName: string }) => {
      if (!solanaWallet?.address) throw new Error('Wallet not connected')
      if (!hasEnoughSol) throw new Error('Insufficient SOL balance')

      const userPublicKey = new PublicKey(solanaWallet.address)

      // Clean up old localStorage entries
      cleanupOldVotes()

      const transactionId = `${pollId}-${candidateName}-${userPublicKey.toString()}`
      const processedVotes = JSON.parse(localStorage.getItem('processedVotes') || '{}')

      // Check if this exact vote was processed recently (within last 5 minutes)
      const recentVoteTime = processedVotes[transactionId]
      if (recentVoteTime && (Date.now() - recentVoteTime) < 5 * 60 * 1000) {
        throw new Error('This vote has already been processed recently')
      }

      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(new BN(pollId).toArray('le', 8))],
        programId
      )

      const [candidatePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(new BN(pollId).toArray('le', 8)),
          Buffer.from(candidateName)
        ],
        programId
      )

      const [voterRecordPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from(new BN(pollId).toArray('le', 8)),
          userPublicKey.toBuffer()
        ],
        programId
      )

      try {
        // Build the transaction instruction
        const instruction = await program.methods
          .vote(candidateName, new BN(pollId))
          .accounts({
            signer: userPublicKey,
            poll: pollPda,
            candidate: candidatePda,
            voterRecord: voterRecordPda,
            systemProgram: SystemProgram.programId
          })
          .instruction()

        // Get fresh blockhash to avoid reuse
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')

        // Create and send transaction with skipPreflight to avoid simulation issues
        const transaction = new Transaction({
          feePayer: userPublicKey,
          blockhash,
          lastValidBlockHeight
        }).add(instruction)

        // Send transaction using the provider's sendAndConfirm method
        const signature = await provider.sendAndConfirm(transaction, [], {
          skipPreflight: true,
          maxRetries: 3,
          commitment: 'confirmed'
        })

        return signature
      } catch (error: any) {
        // If the error suggests the transaction was already processed, check if it actually succeeded
        if (error.message?.includes('already been processed') || error.message?.includes('This transaction has already been processed')) {
          // Wait a bit and check if the vote was actually registered
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          try {
            const candidateAccount = await program.account.candidate.fetch(candidatePda)
            // If we can fetch the candidate and it exists, the vote likely went through
            console.log('Vote appears to have been successful despite simulation error')
            return 'vote-successful-despite-error'
          } catch (fetchError) {
            // If we can't fetch, the vote probably didn't go through
            throw error
          }
        }
        throw error
      }
    },
    onSuccess: (tx) => {
      transactionToast(tx)
      toast.success('Vote cast successfully!')
      return polls.refetch()
    },
    onError: (error: any) => {
      console.error('Vote error:', error)
      if (error.message?.includes('SOL')) {
        toast.error(error.message)
      } else if (error.message?.includes('already been processed')) {
        toast.error('This vote has already been processed')
      } else {
        toast.error('Failed to cast vote: ' + (error.message || 'Unknown error'))
      }
    },
  })

  // Get candidates for a specific poll
  const getPollCandidates = async (pollId: number) => {
    try {
      const accounts = await program.account.candidate.all()
      // Filter candidates that belong to this poll
      return accounts.filter(account => {
        const pollIdBuffer = Buffer.from(new BN(pollId).toArray('le', 8))
        const candidateNameBuffer = Buffer.from(account.account.candidateName)
        const [candidatePda] = PublicKey.findProgramAddressSync(
          [pollIdBuffer, candidateNameBuffer],
          programId
        )
        return candidatePda.equals(account.publicKey)
      })
    } catch (error) {
      console.error('Error fetching candidates:', error)
      return []
    }
  }

  // Function to check if the current user is an admin (the creator of the poll)
  const isUserAdmin = (pollCreator: PublicKey | null) => {
    if (!solanaWallet?.address || !pollCreator) return false
    return solanaWallet.address === pollCreator.toString()
  }

  return {
    program,
    programId,
    polls,
    initializePoll,
    hidePoll,
    initializeCandidate,
    vote,
    closePollEarly,
    getPollCandidates,
    solBalance,
    hasEnoughSol,
    REQUIRED_SOL_AMOUNT,
    unhidePoll,
    getHiddenPollsData,
    setPollActive,
    isPollActive,
    isUserAdmin
  }
} 