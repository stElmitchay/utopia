// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import VotingapplicationIDL from '../../src/app/idl/votingapplication.json'

// Use the IDL as the type source
export type Votingapplication = typeof VotingapplicationIDL

// Re-export the generated IDL and type
export { VotingapplicationIDL }

// The programId is imported from the program IDL.
export const VOTINGAPPLICATION_PROGRAM_ID = new PublicKey(VotingapplicationIDL.address)

// This is a helper function to get the Votingapplication Anchor program.
export function getVotingapplicationProgram(provider: AnchorProvider, address?: PublicKey) {
  // If a custom address is provided, create a new IDL with that address
  const idl = address
    ? { ...VotingapplicationIDL, address: address.toBase58() }
    : VotingapplicationIDL
  return new Program(idl as Idl, provider)
}

// This is a helper function to get the program ID for the Votingapplication program depending on the cluster.
export function getVotingapplicationProgramId(cluster: Cluster) {
  // Always use the IDL's address as the source of truth
  return VOTINGAPPLICATION_PROGRAM_ID
}
