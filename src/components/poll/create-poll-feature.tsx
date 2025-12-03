'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { PrivyWalletButton } from '../solana/privy-wallet-button'
import { CreatePollForm } from '../voting/voting-ui'
import { useVotingProgram } from '../voting/voting-data-access'
import toast from 'react-hot-toast'
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { usePrivyAnchorProvider } from '../solana/privy-anchor-provider'
import { getVotingapplicationProgramId } from '@project/anchor'
import { ConfirmationModal } from '../ui/confirmation-modal'
import { useCluster } from '../cluster/cluster-data-access'

export default function CreatePollFeature() {
  const { ready, authenticated } = usePrivy()
  const { cluster } = useCluster()
  const {
    publicKey: walletPublicKey,
    solanaWallet,
    signAndSendTransaction,
    connection,
    isReady: walletReady
  } = usePrivyAnchorProvider()

  const router = useRouter()
  const [stage, setStage] = useState(1) // 1: Poll details, 2: Add candidates
  const [pollDetails, setPollDetails] = useState<any>(null)
  const [candidates, setCandidates] = useState<string[]>([])
  const [newCandidate, setNewCandidate] = useState('')
  const { program } = useVotingProgram()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const programId = getVotingapplicationProgramId(cluster.network as any)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const handlePollCreated = (details: any) => {
    setPollDetails(details)
    setStage(2)
  }

  const handleAddCandidate = () => {
    const trimmedCandidate = newCandidate.trim();
    if (trimmedCandidate !== '') {
      // Check if candidate name already exists
      if (candidates.some(c => c.toLowerCase() === trimmedCandidate.toLowerCase())) {
        toast.error('A candidate with this name already exists');
        return;
      }
      setCandidates([...candidates, trimmedCandidate]);
      setNewCandidate('');
    }
  }

  const handleRemoveCandidate = (index: number) => {
    const newCandidates = [...candidates]
    newCandidates.splice(index, 1)
    setCandidates(newCandidates)
  }

  const handleFinishClick = () => {
    if (candidates.length < 2 || !pollDetails) return
    setShowConfirmation(true)
  }

  const handleConfirmCreate = async () => {
    setShowConfirmation(false)
    setIsSubmitting(true)
    setErrorMessage(null)

    if (!walletPublicKey) {
      setErrorMessage('Wallet not connected')
      setIsSubmitting(false)
      return
    }

    try {
      console.log('[CreatePoll] Building instructions manually')

      // Add poll initialization instruction
      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(new BN(pollDetails.pollId).toArray('le', 8))],
        programId
      )

      console.log('[CreatePoll]   programId:', programId.toString())
      console.log('[CreatePoll]   signer:', walletPublicKey.toString())
      console.log('[CreatePoll]   poll PDA:', pollPda.toString())

      // Build initialize poll instruction manually
      // InitializePoll instruction discriminator from IDL: [193, 22, 99, 197, 18, 33, 115, 117]
      const initPollDiscriminator = Buffer.from([193, 22, 99, 197, 18, 33, 115, 117])
      const pollIdBytes = Buffer.from(new BN(pollDetails.pollId).toArray('le', 8))
      const descriptionBytes = Buffer.from(pollDetails.description, 'utf8')
      const descriptionLen = Buffer.alloc(4)
      descriptionLen.writeUInt32LE(descriptionBytes.length, 0)
      const pollStartBytes = Buffer.from(new BN(pollDetails.pollStart).toArray('le', 8))
      const pollEndBytes = Buffer.from(new BN(pollDetails.pollEnd).toArray('le', 8))
      const initPollData = Buffer.concat([initPollDiscriminator, pollIdBytes, descriptionLen, descriptionBytes, pollStartBytes, pollEndBytes])

      const initializePollIx = new TransactionInstruction({
        keys: [
          { pubkey: walletPublicKey, isSigner: true, isWritable: true },
          { pubkey: pollPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: programId,
        data: initPollData,
      })

      const instructions: TransactionInstruction[] = [initializePollIx]

      // Add candidate initialization instructions
      // InitializeCandidate instruction discriminator from IDL: [210, 107, 118, 204, 255, 97, 112, 26]
      const initCandidateDiscriminator = Buffer.from([210, 107, 118, 204, 255, 97, 112, 26])

      for (const candidate of candidates) {
        const [candidatePda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from(new BN(pollDetails.pollId).toArray('le', 8)),
            Buffer.from(candidate)
          ],
          programId
        )

        console.log('[CreatePoll]   candidate PDA for', candidate, ':', candidatePda.toString())

        // Build candidate instruction data
        const candidateNameBytes = Buffer.from(candidate, 'utf8')
        const candidateNameLen = Buffer.alloc(4)
        candidateNameLen.writeUInt32LE(candidateNameBytes.length, 0)
        const initCandidateData = Buffer.concat([initCandidateDiscriminator, candidateNameLen, candidateNameBytes, pollIdBytes])

        const initializeCandidateIx = new TransactionInstruction({
          keys: [
            { pubkey: walletPublicKey, isSigner: true, isWritable: true },
            { pubkey: pollPda, isSigner: false, isWritable: true },
            { pubkey: candidatePda, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId: programId,
          data: initCandidateData,
        })

        instructions.push(initializeCandidateIx)
      }

      // Get recent blockhash for the transaction
      const { blockhash } = await connection.getLatestBlockhash('confirmed')

      // Create a VersionedTransaction using MessageV0 for strict account ordering
      const messageV0 = new TransactionMessage({
        payerKey: walletPublicKey,
        recentBlockhash: blockhash,
        instructions: instructions,
      }).compileToV0Message()

      const versionedTransaction = new VersionedTransaction(messageV0)

      console.log('[CreatePoll] Created VersionedTransaction with', instructions.length, 'instructions')

      // Use Privy's signAndSendTransaction
      const signature = await signAndSendTransaction(versionedTransaction)
      console.log('Transaction signature:', signature)

      // Show success message
      toast.success('Poll and candidates created successfully!')

      // Wait a moment to ensure the transaction is processed
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Redirect to voting page
      router.push('/voting')
    } catch (error: any) {
      console.error('Error creating poll:', error)

      // Check for account already in use error
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errorMsg.includes('already in use')) {
        // Generate a suggested new ID
        const suggestedId = pollDetails.pollId + Math.floor(Math.random() * 1000) + 1;
        setErrorMessage(`This poll ID (${pollDetails.pollId}) is already taken. Please go back and try using a different ID, such as ${suggestedId}.`);
      } else if (errorMsg.includes('already been processed')) {
        // If the transaction was already processed, consider it a success
        toast.success('Poll and candidates created successfully!')
        router.push('/voting')
      } else {
        setErrorMessage(`Failed to create poll: ${errorMsg}`);
        toast.error(`Failed to create poll: ${errorMsg.substring(0, 100)}${errorMsg.length > 100 ? '...' : ''}`);
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!authenticated || !solanaWallet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full">
          <div className="bg-card border-2 border-border p-12 text-center">
            <h1 className="brutalist-title text-5xl text-foreground mb-6">
              CREATE
              <br />
              <span className="text-stroke">POLL</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Connect your wallet to create a new poll on the Solana blockchain.
            </p>
            <div className="mb-6">
              <PrivyWalletButton />
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              SECURE • TRANSPARENT • ON-CHAIN
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmCreate}
        isLoading={isSubmitting}
        title="Create Poll & Add Candidates?"
        message={
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-[#A3E4D7] mb-1">Poll Details:</p>
              <p className="text-sm">ID: {pollDetails?.pollId}</p>
              <p className="text-sm">Description: {pollDetails?.description}</p>
              <p className="text-sm">
                Start: {pollDetails && new Date(pollDetails.pollStart * 1000).toLocaleString()}
              </p>
              <p className="text-sm">
                End: {pollDetails && new Date(pollDetails.pollEnd * 1000).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#A3E4D7] mb-1">Candidates ({candidates.length}):</p>
              <ul className="text-sm space-y-1">
                {candidates.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-600/40 rounded p-2 mt-3">
              <p className="text-xs text-[#F5F5DC]/80">
                ⚠️ <strong>Warning:</strong> This action is permanent. Poll and candidates cannot be edited or deleted after creation.
              </p>
            </div>
          </div>
        }
        confirmText="Create Poll"
        cancelText="Review Again"
      />
    <div className="min-h-screen bg-background py-16 px-6 md:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="brutalist-title text-4xl md:text-5xl text-foreground mb-2">
                CREATE POLL
              </h1>
              <p className="text-muted-foreground font-mono text-sm">
                Step {stage} of 2
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="h-1 bg-border mb-6">
              <div style={{ width: `${stage * 50}%` }} className="h-full bg-accent transition-all duration-500"></div>
            </div>
            <div className="flex justify-between font-bold text-sm">
              <div className={stage >= 1 ? 'text-accent' : 'text-muted-foreground'}>
                01. POLL DETAILS
              </div>
              <div className={stage >= 2 ? 'text-accent' : 'text-muted-foreground'}>
                02. ADD CANDIDATES
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border-2 border-border">
          {stage === 1 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 pb-4 border-b-2 border-border">
                POLL DETAILS
              </h2>
              <CreatePollForm onPollCreated={handlePollCreated} />
            </div>
          )}

          {stage === 2 && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6 pb-4 border-b-2 border-border">
                ADD CANDIDATES
              </h2>

              <div className="bg-accent/10 border-2 border-accent p-6 text-foreground mb-6">
                <p className="font-bold mb-2">Important Notice</p>
                <p className="text-sm text-muted-foreground">
                  Add at least two candidates to your poll. You cannot add or remove candidates after the poll starts.
                </p>
              </div>

              {errorMessage && (
                <div className="bg-destructive/10 border-2 border-destructive text-destructive p-4 text-sm mb-6">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-6">
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Enter candidate name"
                    className="flex-grow px-4 py-3 bg-background border-2 border-border text-foreground focus:outline-none focus:border-accent placeholder-muted-foreground"
                    value={newCandidate}
                    onChange={(e) => setNewCandidate(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCandidate()}
                  />
                  <button
                    onClick={handleAddCandidate}
                    className="px-6 py-3 bg-accent border-2 border-accent text-background font-bold hover:bg-accent/90 transition-colors"
                  >
                    ADD
                  </button>
                </div>

                {candidates.length > 0 ? (
                  <div className="border-2 border-border p-6">
                    <h3 className="text-foreground font-bold mb-4">CANDIDATES ({candidates.length})</h3>
                    <ul className="space-y-3">
                      {candidates.map((candidate, index) => (
                        <li key={index} className="flex justify-between items-center p-4 bg-background border-2 border-border">
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-accent text-background flex items-center justify-center font-bold text-sm">
                              {index + 1}
                            </div>
                            <span className="font-bold text-foreground">{candidate}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveCandidate(index)}
                            className="text-muted-foreground hover:text-destructive p-2 border-2 border-transparent hover:border-destructive transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="border-2 border-border text-muted-foreground py-12 px-6 text-center">
                    <p className="font-mono text-sm">
                      NO CANDIDATES YET
                      <br />
                      <span className="text-xs">Add at least two candidates to continue</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-10 flex items-center justify-between pt-6 border-t-2 border-border">
                <button
                  onClick={() => {
                    setStage(1);
                    setErrorMessage(null);
                  }}
                  className="px-6 py-3 border-2 border-border text-foreground font-bold hover:bg-foreground hover:text-background transition-colors"
                >
                  ← BACK
                </button>
                <button
                  onClick={handleFinishClick}
                  className="px-6 py-3 bg-accent border-2 border-accent text-background font-bold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={candidates.length < 2 || isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-b-2 border-background"></div>
                      <span>CREATING...</span>
                    </div>
                  ) : (
                    'CREATE POLL'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
} 