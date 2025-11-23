'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { PrivyWalletButton } from '../solana/privy-wallet-button'
import { AppHero, ellipsify } from '../ui/ui-layout'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useVotingapplicationProgram } from './votingapplication-data-access'
import { VotingapplicationCreate, VotingapplicationList } from './votingapplication-ui'
import { useState, useEffect, useMemo } from 'react'

export default function VotingapplicationFeature() {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const { programId } = useVotingapplicationProgram()
  const [isLoading, setIsLoading] = useState(true)

  const solanaWallet = useMemo(() => {
    console.log('[VotingApplicationFeature] Wallets:', wallets)
    return wallets[0] // First wallet is the embedded Solana wallet
  }, [wallets])

  return authenticated && solanaWallet ? (
    <div>
      <AppHero
        title="Votingapplication"
        subtitle={
          'Create a new account by clicking the "Create" button. The state of a account is stored on-chain and can be manipulated by calling the program\'s methods (increment, decrement, set, and close).'
        }
      >
        <p className="mb-6">
          <ExplorerLink path={`account/${programId}`} label={ellipsify(programId.toString())} />
        </p>
        <VotingapplicationCreate />
      </AppHero>
      <VotingapplicationList />
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <PrivyWalletButton />
        </div>
      </div>
    </div>
  )
}
