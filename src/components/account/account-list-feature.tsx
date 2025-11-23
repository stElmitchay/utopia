'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { useMemo } from 'react'
import { redirect } from 'next/navigation'
import { PrivyWalletButton } from '../solana/privy-wallet-button'

export default function AccountListFeature() {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()

  const solanaWallet = useMemo(() => {
    console.log('[AccountListFeature] Wallets:', wallets)
    return wallets[0] // First wallet is the embedded Solana wallet
  }, [wallets])

  if (authenticated && solanaWallet) {
    return redirect(`/account/${solanaWallet.address}`)
  }

  return (
    <div className="hero py-[64px]">
      <div className="hero-content text-center">
        <PrivyWalletButton />
      </div>
    </div>
  )
}
