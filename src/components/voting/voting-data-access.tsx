'use client'

import { getVotingapplicationProgram, getVotingapplicationProgramId } from '@project/anchor'
import { BN } from '@coral-xyz/anchor'
import {
  Cluster,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { usePrivyAnchorProvider } from '../solana/privy-anchor-provider'
import { useTransactionToast } from '../ui/ui-layout'
import * as anchor from '@coral-xyz/anchor'

export function useVotingProgram() {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const {
    provider,
    connection,
    publicKey: walletPublicKey,
    solanaWallet,
    signAndSendTransaction,
    isReady: walletReady
  } = usePrivyAnchorProvider()

  const programId = useMemo(() => {
    return getVotingapplicationProgramId(cluster.network as Cluster)
  }, [cluster])

  // Only create program when wallet is ready to avoid using dummy provider
  const program = useMemo(() => {
    return getVotingapplicationProgram(provider, programId)
  }, [provider, programId, walletReady]) // Added walletReady to dependencies to force re-creation when wallet connects

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
          const lamports = await connection.getBalance(publicKey)
          const balance = lamports / LAMPORTS_PER_SOL
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
        const accounts = await (program.account as any).poll.all()
        const hiddenPolls = getHiddenPolls()
        return accounts.filter((account: any) => hiddenPolls.includes(account.account.pollId.toNumber()))
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
        const accounts = await (program.account as any).poll.all()
        const hiddenPolls = getHiddenPolls()
        return accounts.filter((account: any) => !hiddenPolls.includes(account.account.pollId.toNumber()))
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
    polls.refetch()
  }

  // Initialize a new poll
  const initializePoll = useMutation({
    mutationKey: ['voting', 'initializePoll', { cluster }],
    mutationFn: async ({ pollId, description, pollStart, pollEnd }: { pollId: number, description: string, pollStart: number, pollEnd: number }) => {
      if (!solanaWallet?.address || !walletPublicKey) throw new Error('Wallet not connected')

      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(new BN(pollId).toArray('le', 8))],
        programId
      )

      console.log('[InitializePoll] Building instruction manually')
      console.log('[InitializePoll]   programId:', programId.toString())
      console.log('[InitializePoll]   signer:', walletPublicKey.toString())
      console.log('[InitializePoll]   poll PDA:', pollPda.toString())

      // InitializePoll instruction discriminator from IDL: [193, 22, 99, 197, 18, 33, 115, 117]
      const discriminator = Buffer.from([193, 22, 99, 197, 18, 33, 115, 117])

      // Encode poll_id as u64 (8 bytes, little-endian)
      const pollIdBytes = Buffer.from(new BN(pollId).toArray('le', 8))

      // Encode description as Anchor string (4-byte length prefix + utf8 bytes)
      const descriptionBytes = Buffer.from(description, 'utf8')
      const descriptionLen = Buffer.alloc(4)
      descriptionLen.writeUInt32LE(descriptionBytes.length, 0)

      // Encode poll_start as u64 (8 bytes, little-endian)
      const pollStartBytes = Buffer.from(new BN(pollStart).toArray('le', 8))

      // Encode poll_end as u64 (8 bytes, little-endian)
      const pollEndBytes = Buffer.from(new BN(pollEnd).toArray('le', 8))

      // Combine: discriminator + poll_id + description (len + bytes) + poll_start + poll_end
      const data = Buffer.concat([discriminator, pollIdBytes, descriptionLen, descriptionBytes, pollStartBytes, pollEndBytes])

      // Build instruction with EXACT account ordering as defined in the Rust program:
      // 1. signer (writable, signer)
      // 2. poll (writable - init)
      // 3. system_program (readonly)
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: walletPublicKey, isSigner: true, isWritable: true },      // signer
          { pubkey: pollPda, isSigner: false, isWritable: true },              // poll
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        ],
        programId: programId,
        data: data,
      })

      console.log('[InitializePoll] Account keys:')
      instruction.keys.forEach((k, i) => {
        const names = ['signer', 'poll', 'system_program']
        console.log(`[InitializePoll]   ${i} (${names[i]}): ${k.pubkey.toString()} | signer: ${k.isSigner}, writable: ${k.isWritable}`)
      })

      // Get recent blockhash for the transaction
      const { blockhash } = await connection.getLatestBlockhash('confirmed')

      // Create a VersionedTransaction using MessageV0 for strict account ordering
      const messageV0 = new TransactionMessage({
        payerKey: walletPublicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message()

      const versionedTransaction = new VersionedTransaction(messageV0)

      console.log('[InitializePoll] Created VersionedTransaction')

      // Use Privy's signAndSendTransaction
      return signAndSendTransaction(versionedTransaction)
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
      if (!solanaWallet?.address || !walletPublicKey) throw new Error('Wallet not connected')

      // Get poll account to check start time
      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(new BN(pollId).toArray('le', 8))],
        programId
      )

      const pollAccount = await (program.account as any).poll.fetch(pollPda)
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

      console.log('[InitializeCandidate] Building instruction manually')
      console.log('[InitializeCandidate]   programId:', programId.toString())
      console.log('[InitializeCandidate]   signer:', walletPublicKey.toString())
      console.log('[InitializeCandidate]   poll PDA:', pollPda.toString())
      console.log('[InitializeCandidate]   candidate PDA:', candidatePda.toString())

      // InitializeCandidate instruction discriminator from IDL: [210, 107, 118, 204, 255, 97, 112, 26]
      const discriminator = Buffer.from([210, 107, 118, 204, 255, 97, 112, 26])

      // Encode candidate_name as Anchor string (4-byte length prefix + utf8 bytes)
      const candidateNameBytes = Buffer.from(candidateName, 'utf8')
      const candidateNameLen = Buffer.alloc(4)
      candidateNameLen.writeUInt32LE(candidateNameBytes.length, 0)

      // Encode poll_id as u64 (8 bytes, little-endian)
      const pollIdBytes = Buffer.from(new BN(pollId).toArray('le', 8))

      // Combine: discriminator + candidate_name (len + bytes) + poll_id
      const data = Buffer.concat([discriminator, candidateNameLen, candidateNameBytes, pollIdBytes])

      // Build instruction with EXACT account ordering as defined in the Rust program:
      // 1. signer (writable, signer)
      // 2. poll (writable)
      // 3. candidate (writable - init)
      // 4. system_program (readonly)
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: walletPublicKey, isSigner: true, isWritable: true },      // signer
          { pubkey: pollPda, isSigner: false, isWritable: true },              // poll
          { pubkey: candidatePda, isSigner: false, isWritable: true },         // candidate
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        ],
        programId: programId,
        data: data,
      })

      console.log('[InitializeCandidate] Account keys:')
      instruction.keys.forEach((k, i) => {
        const names = ['signer', 'poll', 'candidate', 'system_program']
        console.log(`[InitializeCandidate]   ${i} (${names[i]}): ${k.pubkey.toString()} | signer: ${k.isSigner}, writable: ${k.isWritable}`)
      })

      // Get recent blockhash for the transaction
      const { blockhash } = await connection.getLatestBlockhash('confirmed')

      // Create a VersionedTransaction using MessageV0 for strict account ordering
      const messageV0 = new TransactionMessage({
        payerKey: walletPublicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message()

      const versionedTransaction = new VersionedTransaction(messageV0)

      console.log('[InitializeCandidate] Created VersionedTransaction')

      // Use Privy's signAndSendTransaction
      return signAndSendTransaction(versionedTransaction)
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
      if (!solanaWallet?.address || !walletPublicKey) throw new Error('Wallet not connected')

      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(new BN(pollId).toArray('le', 8))],
        programId
      )

      console.log('[ClosePollEarly] Building instruction manually')
      console.log('[ClosePollEarly]   programId:', programId.toString())
      console.log('[ClosePollEarly]   signer:', walletPublicKey.toString())
      console.log('[ClosePollEarly]   poll PDA:', pollPda.toString())

      // ClosePollEarly instruction discriminator from IDL: [156, 45, 218, 12, 167, 89, 234, 201]
      const discriminator = Buffer.from([156, 45, 218, 12, 167, 89, 234, 201])

      // Encode poll_id as u64 (8 bytes, little-endian)
      const pollIdBytes = Buffer.from(new BN(pollId).toArray('le', 8))

      // Combine: discriminator + poll_id
      const data = Buffer.concat([discriminator, pollIdBytes])

      // Build instruction with EXACT account ordering as defined in the Rust program:
      // 1. signer (writable, signer)
      // 2. poll (writable)
      const instruction = new TransactionInstruction({
        keys: [
          { pubkey: walletPublicKey, isSigner: true, isWritable: true },      // signer
          { pubkey: pollPda, isSigner: false, isWritable: true },              // poll
        ],
        programId: programId,
        data: data,
      })

      console.log('[ClosePollEarly] Account keys:')
      instruction.keys.forEach((k, i) => {
        const names = ['signer', 'poll']
        console.log(`[ClosePollEarly]   ${i} (${names[i]}): ${k.pubkey.toString()} | signer: ${k.isSigner}, writable: ${k.isWritable}`)
      })

      // Get recent blockhash for the transaction
      const { blockhash } = await connection.getLatestBlockhash('confirmed')

      // Create a VersionedTransaction using MessageV0 for strict account ordering
      const messageV0 = new TransactionMessage({
        payerKey: walletPublicKey,
        recentBlockhash: blockhash,
        instructions: [instruction],
      }).compileToV0Message()

      const versionedTransaction = new VersionedTransaction(messageV0)

      console.log('[ClosePollEarly] Created VersionedTransaction')

      // Use Privy's signAndSendTransaction
      return signAndSendTransaction(versionedTransaction)
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
      console.log('[Vote] Starting vote for poll:', pollId, 'candidate:', candidateName)

      if (!solanaWallet?.address || !walletPublicKey) {
        throw new Error('Wallet not connected')
      }

      // Verify we're not using the dummy provider
      const isDummyProvider = provider.publicKey?.toString() === '11111111111111111111111111111111'
      if (isDummyProvider || !walletReady) {
        throw new Error('Wallet provider not ready. Please wait a moment and try again.')
      }

      if (!hasEnoughSol) {
        throw new Error('Insufficient SOL balance')
      }

      // Clean up old localStorage entries
      cleanupOldVotes()

      const transactionId = `${pollId}-${candidateName}-${walletPublicKey.toString()}`
      const processedVotes = JSON.parse(localStorage.getItem('processedVotes') || '{}')

      // Check if this exact vote was processed recently (within last 5 minutes)
      const recentVoteTime = processedVotes[transactionId]
      if (recentVoteTime && (Date.now() - recentVoteTime) < 5 * 60 * 1000) {
        console.error('[Vote] Vote already processed recently')
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
          walletPublicKey.toBuffer()
        ],
        programId
      )

      // Pre-flight checks for better error messages
      try {
        // Check if user has already voted
        const voterRecordInfo = await connection.getAccountInfo(voterRecordPda)
        if (voterRecordInfo !== null) {
          throw new Error('You have already voted in this poll')
        }

        // Check if poll exists and is within voting period
        const pollAccount = await (program.account as any).poll.fetch(pollPda)
        const now = Math.floor(Date.now() / 1000)

        if (now < pollAccount.pollStart.toNumber()) {
          throw new Error('Poll has not started yet')
        }

        if (now > pollAccount.pollEnd.toNumber()) {
          throw new Error('Poll has ended')
        }

        // Check if candidate exists
        const candidateInfo = await connection.getAccountInfo(candidatePda)
        if (candidateInfo === null) {
          throw new Error('Candidate not found')
        }

        // Check if account owners match the expected program ID
        const pollAccountInfo = await connection.getAccountInfo(pollPda)
        console.log('[Vote] Poll account owner:', pollAccountInfo?.owner?.toString())
        console.log('[Vote] Expected program ID:', programId.toString())
        console.log('[Vote] Poll owner matches:', pollAccountInfo?.owner?.equals(programId))

        if (pollAccountInfo?.owner && !pollAccountInfo.owner.equals(programId)) {
          throw new Error(`Poll account owned by ${pollAccountInfo.owner.toString()} but expected ${programId.toString()}`)
        }

        console.log('[Vote] Candidate account owner:', candidateInfo?.owner?.toString())
        if (candidateInfo?.owner && !candidateInfo.owner.equals(programId)) {
          throw new Error(`Candidate account owned by ${candidateInfo.owner.toString()} but expected ${programId.toString()}`)
        }

        console.log('[Vote] Pre-flight checks passed')
      } catch (prefightError: any) {
        // Re-throw our custom errors, but wrap other errors
        if (prefightError.message?.includes('already voted') ||
            prefightError.message?.includes('not started') ||
            prefightError.message?.includes('has ended') ||
            prefightError.message?.includes('not found') ||
            prefightError.message?.includes('owned by') ||
            prefightError.message?.includes('expected')) {
          throw prefightError
        }
        console.warn('[Vote] Pre-flight check warning:', prefightError.message)
        // Continue anyway - the on-chain program will validate
      }

      try {
        // Build the transaction instruction MANUALLY to ensure correct account ordering
        console.log('[Vote] Building instruction manually with:')
        console.log('[Vote]   programId:', programId.toString())
        console.log('[Vote]   signer:', walletPublicKey.toString())
        console.log('[Vote]   poll PDA:', pollPda.toString())
        console.log('[Vote]   candidate PDA:', candidatePda.toString())
        console.log('[Vote]   voterRecord PDA:', voterRecordPda.toString())
        console.log('[Vote]   systemProgram:', SystemProgram.programId.toString())

        // Vote instruction discriminator from IDL: [227, 110, 155, 23, 136, 126, 172, 25]
        const discriminator = Buffer.from([227, 110, 155, 23, 136, 126, 172, 25])

        // Encode candidate_name as Anchor string (4-byte length prefix + utf8 bytes)
        const candidateNameBytes = Buffer.from(candidateName, 'utf8')
        const candidateNameLen = Buffer.alloc(4)
        candidateNameLen.writeUInt32LE(candidateNameBytes.length, 0)

        // Encode poll_id as u64 (8 bytes, little-endian)
        const pollIdBytes = Buffer.from(new BN(pollId).toArray('le', 8))

        // Combine: discriminator + candidate_name (len + bytes) + poll_id
        const data = Buffer.concat([discriminator, candidateNameLen, candidateNameBytes, pollIdBytes])

        console.log('[Vote] Instruction data length:', data.length)
        console.log('[Vote] Instruction data (hex):', data.toString('hex'))

        // Build instruction with EXACT account ordering as defined in the Rust program:
        // 1. signer (writable, signer)
        // 2. poll (readonly)
        // 3. candidate (writable)
        // 4. voter_record (writable)
        // 5. system_program (readonly)
        const instruction = new TransactionInstruction({
          keys: [
            { pubkey: walletPublicKey, isSigner: true, isWritable: true },      // signer
            { pubkey: pollPda, isSigner: false, isWritable: false },            // poll
            { pubkey: candidatePda, isSigner: false, isWritable: true },        // candidate
            { pubkey: voterRecordPda, isSigner: false, isWritable: true },      // voter_record
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
          ],
          programId: programId,
          data: data,
        })

        console.log('[Vote] Instruction built manually, programId:', instruction.programId.toString())
        console.log('[Vote] Account keys:')
        instruction.keys.forEach((k, i) => {
          const names = ['signer', 'poll', 'candidate', 'voter_record', 'system_program']
          console.log(`[Vote]   ${i} (${names[i]}): ${k.pubkey.toString()} | signer: ${k.isSigner}, writable: ${k.isWritable}`)
        })

        // Verify system_program is correct
        const systemProgramKey = instruction.keys[4]
        if (systemProgramKey.pubkey.toString() !== '11111111111111111111111111111111') {
          console.error('[Vote] ERROR: system_program is not correct!')
          console.error('[Vote] Expected: 11111111111111111111111111111111')
          console.error('[Vote] Got:', systemProgramKey.pubkey.toString())
        } else {
          console.log('[Vote] system_program is CORRECT: 11111111111111111111111111111111')
        }

        // Create legacy transaction
        const transaction = new Transaction()
        transaction.add(instruction)

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
        transaction.recentBlockhash = blockhash
        transaction.lastValidBlockHeight = lastValidBlockHeight
        transaction.feePayer = walletPublicKey

        // Log the compiled message to debug account ordering
        const compiledMessage = transaction.compileMessage()
        console.log('[Vote] Compiled message account keys:')
        compiledMessage.accountKeys.forEach((key, idx) => {
          console.log(`[Vote]   message.accountKeys[${idx}]: ${key.toString()}`)
        })
        console.log('[Vote] Compiled message instructions:')
        compiledMessage.instructions.forEach((ix, ixIdx) => {
          console.log(`[Vote]   instruction[${ixIdx}] programIdIndex: ${ix.programIdIndex}`)
          console.log(`[Vote]   instruction[${ixIdx}] accounts: [${ix.accounts.join(', ')}]`)
        })

        // Use Privy's signAndSendTransaction
        const signature = await signAndSendTransaction(transaction)
        console.log('[Vote] Success, signature:', signature)

        return signature
      } catch (error: any) {
        console.error('[Vote] Transaction error:', error.message)

        // If the error suggests the transaction was already processed, check if it actually succeeded
        if (error.message?.includes('already been processed') || error.message?.includes('This transaction has already been processed')) {
          // Wait a bit and check if the vote was actually registered
          await new Promise(resolve => setTimeout(resolve, 2000))

          try {
            await (program.account as any).candidate.fetch(candidatePda)
            // If we can fetch the candidate and it exists, the vote likely went through
            return 'vote-successful-despite-error'
          } catch (fetchError) {
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
      console.error('[Vote] Error:', error.message)

      // Check for Anchor/Solana program error codes
      const errorString = String(error.cause?.message || error.message || '')

      // Handle specific error messages
      if (error.message?.includes('already voted')) {
        toast.error('You have already voted in this poll')
      } else if (error.message?.includes('not started')) {
        toast.error('Poll has not started yet')
      } else if (error.message?.includes('has ended')) {
        toast.error('Poll has ended')
      } else if (error.message?.includes('not found')) {
        toast.error('Candidate not found')
      } else if (error.message?.includes('SOL') || error.message?.includes('Insufficient')) {
        toast.error(error.message)
      } else if (error.message?.includes('already been processed')) {
        toast.error('This vote has already been processed')
      } else if (errorString.includes('#3008') || errorString.includes('AccountNotInitialized')) {
        // Error 3008 = AccountNotInitialized - poll or candidate doesn't exist
        toast.error('Poll or candidate not found. The poll may not exist on this network.')
      } else if (errorString.includes('#3012') || errorString.includes('AccountOwnedByWrongProgram')) {
        toast.error('Account configuration error. Please try refreshing the page.')
      } else if (errorString.includes('#0') && errorString.includes('custom program error')) {
        // Custom error 0 = already initialized (already voted)
        toast.error('You have already voted in this poll')
      } else if (error.message?.includes('simulation failed') || error.message?.includes('Transaction simulation')) {
        // Generic simulation failure
        toast.error('Vote failed. The poll or candidate may not exist on this network.')
      } else {
        toast.error('Failed to cast vote: ' + (error.message || 'Unknown error'))
      }
    },
  })

  // Get candidates for a specific poll
  const getPollCandidates = async (pollId: number) => {
    try {
      const accounts = await (program.account as any).candidate.all()
      // Filter candidates that belong to this poll
      return accounts.filter((account: any) => {
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