'use client'

import { AnchorProvider } from '@coral-xyz/anchor'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'

export function usePrivyAnchorProvider() {
  const { cluster } = useCluster()
  const { ready, authenticated } = usePrivy()
  const { wallets } = useWallets()

  const connection = useMemo(() => new Connection(cluster.endpoint, 'confirmed'), [cluster.endpoint])

  const solanaWallet = useMemo(() => {
    return wallets.find((wallet) => wallet.walletClientType === 'privy' && wallet.chainType === 'solana')
  }, [wallets])

  const wallet = useMemo(() => {
    if (!ready || !authenticated || !solanaWallet) {
      return null
    }

    return {
      publicKey: new PublicKey(solanaWallet.address),
      signTransaction: async <T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> => {
        const provider = await solanaWallet.getProvider()
        if (!provider) throw new Error('Wallet provider not available')

        const signedTx = await provider.signTransaction(transaction)
        return signedTx as T
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> => {
        const provider = await solanaWallet.getProvider()
        if (!provider) throw new Error('Wallet provider not available')

        const signedTxs = await provider.signAllTransactions(transactions)
        return signedTxs as T[]
      },
    }
  }, [ready, authenticated, solanaWallet])

  return useMemo(() => {
    if (!wallet) {
      // Return a dummy provider when wallet is not connected
      return new AnchorProvider(
        connection,
        {
          publicKey: PublicKey.default,
          signTransaction: async (tx: any) => tx,
          signAllTransactions: async (txs: any[]) => txs,
        },
        { commitment: 'confirmed' }
      )
    }

    return new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' })
  }, [connection, wallet])
}
