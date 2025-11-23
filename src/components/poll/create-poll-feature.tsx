'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { PrivyWalletButton } from '../solana/privy-wallet-button'
import { CreatePollForm } from '../voting/voting-ui'
import { useVotingProgram } from '../voting/voting-data-access'
import toast from 'react-hot-toast'
import * as anchor from '@coral-xyz/anchor'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import { usePrivyAnchorProvider } from '../solana/privy-anchor-provider'
import { getVotingapplicationProgramId } from '@project/anchor'
import { ConfirmationModal } from '../ui/confirmation-modal'

export default function CreatePollFeature() {
  const { ready, authenticated } = usePrivy()
  const { ready: walletsReady, wallets } = useWallets()

  const solanaWallet = useMemo(() => {
    console.log('[CreatePoll] Debug:', { ready, authenticated, walletsReady, walletsCount: wallets.length })
    if (!ready || !authenticated || !walletsReady || wallets.length === 0) {
      console.log('[CreatePoll] Wallet not ready yet')
      return null
    }
    console.log('[CreatePoll] Wallet found:', wallets[0])
    return wallets[0] // First wallet is the embedded Solana wallet
  }, [ready, authenticated, walletsReady, wallets])
  const router = useRouter()
  const [stage, setStage] = useState(1) // 1: Poll details, 2: Add candidates
  const [pollDetails, setPollDetails] = useState<any>(null)
  const [candidates, setCandidates] = useState<string[]>([])
  const [newCandidate, setNewCandidate] = useState('')
  const { program } = useVotingProgram()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const provider = usePrivyAnchorProvider()
  const programId = getVotingapplicationProgramId('devnet')
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
    
    try {
      // Create a transaction builder
      const tx = new anchor.web3.Transaction()
      
      // Add poll initialization instruction
      const [pollPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(new BN(pollDetails.pollId).toArray('le', 8))],
        programId
      )

      // Initialize poll
      const initializePollIx = await (program.methods
        .initializePoll(
          new BN(pollDetails.pollId),
          pollDetails.description,
          new BN(pollDetails.pollStart),
          new BN(pollDetails.pollEnd)
        )
        .accounts({
          signer: provider.publicKey,
          poll: pollPda,
          systemProgram: anchor.web3.SystemProgram.programId
        } as any)
        .instruction())

      tx.add(initializePollIx)

      // Add candidate initialization instructions
      for (const candidate of candidates) {
        const [candidatePda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from(new BN(pollDetails.pollId).toArray('le', 8)),
            Buffer.from(candidate)
          ],
          programId
        )

        const initializeCandidateIx = await (program.methods
          .initializeCandidate(
            candidate,
            new BN(pollDetails.pollId)
          )
          .accounts({
            signer: provider.publicKey,
            poll: pollPda,
            candidate: candidatePda,
            systemProgram: anchor.web3.SystemProgram.programId
          } as any)
          .instruction())

        tx.add(initializeCandidateIx)
      }

      // Send the transaction
      const signature = await provider.sendAndConfirm(tx)
      console.log('Transaction signature:', signature)
      
      // Show success message
      toast.success('Poll and candidates created successfully!')
      
      // Wait a moment to ensure the transaction is processed
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Force a refetch of the polls
      console.log('Fetching all polls after creation...')
      const allPolls = await program.account.poll.all()
      console.log('Polls after creation:', allPolls)
      
      // Redirect to voting page
      router.push('/voting')
    } catch (error: any) {
      console.error('Error creating poll:', error)
      
      // Check for account already in use error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('already in use')) {
        // Generate a suggested new ID
        const suggestedId = pollDetails.pollId + Math.floor(Math.random() * 1000) + 1;
        setErrorMessage(`This poll ID (${pollDetails.pollId}) is already taken. Please go back and try using a different ID, such as ${suggestedId}.`);
      } else if (errorMessage.includes('already been processed')) {
        // If the transaction was already processed, consider it a success
        toast.success('Poll and candidates created successfully!')
        router.push('/voting')
      } else {
        setErrorMessage(`Failed to create poll: ${errorMessage}`);
        toast.error(`Failed to create poll: ${errorMessage.substring(0, 100)}${errorMessage.length > 100 ? '...' : ''}`);
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!authenticated || !solanaWallet) {
    return (
      <div className="min-h-screen bg-[#2c5446] flex items-center justify-center">
        <div className="max-w-md px-6">
          <div className="bg-[#3a6b5a] rounded-xl border border-[#2c5446] overflow-hidden">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#0A1A14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-[#F5F5DC] mb-3">Create a New Poll</h1>
              <div className="w-16 h-0.5 bg-[#2c5446] mx-auto mb-5"></div>
              <p className="text-[#F5F5DC] mb-8 px-4">
                Login with your email to create a new poll on the Solana blockchain.
              </p>
              <div className="mb-3">
                <PrivyWalletButton />
              </div>
              <p className="text-sm text-[#F5F5DC]/70">
                Login with your email to get started
              </p>
            </div>
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
    <div className="min-h-screen bg-[#2c5446] py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0A1A14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-[#F5F5DC]">Create a New Poll</h1>
            </div>
            <div className="text-sm font-medium text-[#F5F5DC] flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Step {stage} of 2
            </div>
          </div>
          <div className="mt-4 relative">
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-[#2c5446]">
              <div style={{ width: `${stage * 50}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-[#0A1A14] justify-center bg-[#A3E4D7] transition-all duration-500"></div>
            </div>
            <div className="flex justify-between">
              <div className={`text-sm flex items-center ${stage >= 1 ? 'font-medium text-[#F5F5DC]' : 'text-[#F5F5DC]/50'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Poll Details
              </div>
              <div className={`text-sm flex items-center ${stage >= 2 ? 'font-medium text-[#F5F5DC]' : 'text-[#F5F5DC]/50'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Add Candidates
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#3a6b5a] border border-[#2c5446] overflow-hidden rounded-lg">
          {stage === 1 && (
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0A1A14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[#F5F5DC]">Poll Details</h2>
              </div>
              <CreatePollForm onPollCreated={handlePollCreated} />
            </div>
          )}

          {stage === 2 && (
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#0A1A14]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-[#F5F5DC]">Add Candidates</h2>
              </div>

              <div className="bg-[#2c5446]/20 border border-[#2c5446] text-[#F5F5DC] px-4 py-3 rounded-lg text-sm mb-6">
                <p className="font-medium mb-1">Important Notice:</p>
                <p>Add at least two candidates to your poll. You cannot add or remove candidates after the poll starts.</p>
              </div>

              {errorMessage && (
                <div className="bg-red-900/20 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                  {errorMessage}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex">
                  <input
                    type="text"
                    placeholder="Enter candidate name"
                    className="flex-grow px-4 py-2.5 bg-[#2c5446] border border-[#2c5446] rounded-l-lg text-[#F5F5DC] text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] focus:border-transparent placeholder-[#F5F5DC]/50"
                    value={newCandidate}
                    onChange={(e) => setNewCandidate(e.target.value)}
                  />
                  <button
                    onClick={handleAddCandidate}
                    className="px-4 py-2.5 bg-white text-[#0A1A14] text-sm font-medium rounded-r-lg hover:bg-[#A3E4D7] hover:text-[#0A1A14] transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>

                {candidates.length > 0 ? (
                  <div className="bg-[#2c5446] border border-[#2c5446] rounded-lg p-4">
                    <h3 className="text-[#F5F5DC] text-sm font-medium mb-3">Candidates ({candidates.length})</h3>
                    <ul className="space-y-2">
                      {candidates.map((candidate, index) => (
                        <li key={index} className="flex justify-between items-center p-3 bg-[#2c5446] text-[#F5F5DC] rounded-lg border border-[#2c5446]">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-white text-[#0A1A14] rounded-full flex items-center justify-center font-medium text-sm mr-3">
                              {index + 1}
                            </div>
                            <span>{candidate}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveCandidate(index)}
                            className="text-[#F5F5DC]/70 hover:text-red-400 p-1 rounded"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-[#2c5446] border border-[#2c5446] text-[#F5F5DC]/70 rounded-lg py-8 px-4 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-[#F5F5DC]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>No candidates added yet. Add at least two candidates.</p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => {
                    setStage(1);
                    setErrorMessage(null);
                  }}
                  className="px-5 py-2.5 bg-transparent text-[#F5F5DC] border border-[#2c5446] text-sm font-medium rounded-lg hover:bg-[#2c5446] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A3E4D7]"
                >
                  Back
                </button>
                <button
                  onClick={handleFinishClick}
                  className="px-5 py-2.5 bg-white text-[#0A1A14] text-sm font-medium rounded-lg hover:bg-[#A3E4D7] hover:text-[#0A1A14] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A3E4D7] disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={candidates.length < 2 || isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-[#0A1A14] rounded-full"></div>
                      <span>Creating Poll...</span>
                    </div>
                  ) : (
                    'Create Poll'
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