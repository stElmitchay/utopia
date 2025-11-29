'use client'

import { AnchorProvider } from '@coral-xyz/anchor'
import { usePrivy } from '@privy-io/react-auth'
import { useWallets, useSignTransaction } from '@privy-io/react-auth/solana'
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import { useMemo, useCallback } from 'react'
import { useCluster } from '../cluster/cluster-data-access'

// Custom hook that provides both the AnchorProvider and a sendTransaction function
export function usePrivyAnchorProvider() {
  const { cluster } = useCluster()
  const { ready, authenticated } = usePrivy()
  const { wallets, ready: walletsReady } = useWallets()
  const { signTransaction: privySignTransaction } = useSignTransaction()

  const connection = useMemo(() => new Connection(cluster.endpoint, 'confirmed'), [cluster.endpoint])

  // Get the chain identifier for Privy
  const getChainId = useCallback((): 'solana:devnet' | 'solana:mainnet' | 'solana:testnet' => {
    if (cluster.network === 'mainnet-beta') return 'solana:mainnet'
    if (cluster.network === 'devnet') return 'solana:devnet'
    if (cluster.network === 'testnet') return 'solana:testnet'
    return 'solana:devnet' // Default to devnet
  }, [cluster.network])

  // Get the embedded Solana wallet
  const solanaWallet = useMemo(() => {
    if (!walletsReady || wallets.length === 0) {
      return null
    }
    // Find the Privy embedded wallet specifically
    const privyWallet = wallets.find((w) => w.standardWallet?.name === 'Privy')
    return privyWallet || wallets[0]
  }, [walletsReady, wallets])

  const publicKey = useMemo(() => {
    if (!solanaWallet?.address) return null
    return new PublicKey(solanaWallet.address)
  }, [solanaWallet?.address])

  // Function to sign transaction with Privy and send with web3.js
  const signAndSendTransaction = useCallback(async (transaction: Transaction | VersionedTransaction): Promise<string> => {
    if (!solanaWallet || !publicKey) {
      throw new Error('Wallet not connected')
    }

    if (!solanaWallet.address) {
      throw new Error('Wallet address not available')
    }

    // Prepare the transaction with blockhash and fee payer
    if (transaction instanceof Transaction) {
      if (!transaction.recentBlockhash) {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
        transaction.recentBlockhash = blockhash
        transaction.lastValidBlockHeight = lastValidBlockHeight
      }

      if (!transaction.feePayer) {
        transaction.feePayer = publicKey
      }
    }

    // Log transaction details before serialization
    if (transaction instanceof Transaction) {
      console.log('[Privy] Transaction details before serialization:')
      console.log('[Privy]   feePayer:', transaction.feePayer?.toString())
      console.log('[Privy]   recentBlockhash:', transaction.recentBlockhash)
      console.log('[Privy]   instructions count:', transaction.instructions.length)

      transaction.instructions.forEach((ix, idx) => {
        console.log(`[Privy]   instruction[${idx}] programId:`, ix.programId.toString())
        console.log(`[Privy]   instruction[${idx}] keys count:`, ix.keys.length)
        ix.keys.forEach((key, keyIdx) => {
          console.log(`[Privy]     key[${keyIdx}]: ${key.pubkey.toString()} (signer: ${key.isSigner}, writable: ${key.isWritable})`)
        })
      })
    }

    // Serialize for Privy signing
    const serializedTransaction = transaction instanceof Transaction
      ? transaction.serialize({ requireAllSignatures: false, verifySignatures: false })
      : transaction.serialize()

    const chainId = getChainId()
    console.log('[Privy] Signing transaction, size:', serializedTransaction.length, 'bytes, chain:', chainId)
    console.log('[Privy] Serialized transaction (base64):', Buffer.from(serializedTransaction).toString('base64'))

    try {
      // Use Privy only to sign the transaction
      const { signedTransaction } = await privySignTransaction({
        transaction: serializedTransaction,
        wallet: solanaWallet,
        chain: chainId,
      })

      console.log('[Privy] Transaction signed, size:', signedTransaction.length, 'bytes')
      console.log('[Privy] Signed transaction (base64):', Buffer.from(signedTransaction).toString('base64'))

      // Deserialize the signed transaction to verify it wasn't modified
      try {
        const deserializedTx = Transaction.from(signedTransaction)
        console.log('[Privy] Deserialized signed transaction:')
        console.log('[Privy]   feePayer:', deserializedTx.feePayer?.toString())
        console.log('[Privy]   recentBlockhash:', deserializedTx.recentBlockhash)
        console.log('[Privy]   signatures count:', deserializedTx.signatures.length)
        const msg = deserializedTx.compileMessage()
        console.log('[Privy]   accountKeys:')
        msg.accountKeys.forEach((key, idx) => {
          console.log(`[Privy]     [${idx}]: ${key.toString()}`)
        })
        msg.instructions.forEach((ix, ixIdx) => {
          console.log(`[Privy]   instruction[${ixIdx}] accounts: [${ix.accounts.join(', ')}]`)
        })
      } catch (deserErr) {
        console.warn('[Privy] Could not deserialize signed transaction (might be versioned):', deserErr)
      }

      console.log('[Privy] Sending via web3.js...')

      // Send the signed transaction using web3.js connection
      const signature = await connection.sendRawTransaction(signedTransaction, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      })

      console.log('[web3.js] Transaction sent:', signature)

      // Confirm the transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed')

      console.log('[web3.js] Transaction confirmed:', signature)

      return signature
    } catch (error: any) {
      console.error('[Transaction] Error:', error.message)

      // Extract more useful error info
      if (error.logs) {
        console.error('[Transaction] Logs:', error.logs)
      }

      throw error
    }
  }, [solanaWallet, publicKey, connection, privySignTransaction, getChainId])

  // Create a wallet adapter that works with AnchorProvider
  const wallet = useMemo(() => {
    if (!ready || !authenticated || !solanaWallet || !publicKey) {
      return null
    }

    return {
      publicKey,
      signTransaction: async <T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> => {
        // This won't be used directly - we use signAndSendTransaction instead
        console.warn('[PrivyAnchorProvider] signTransaction called directly')
        return transaction
      },
      signAllTransactions: async <T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> => {
        console.warn('[PrivyAnchorProvider] signAllTransactions called directly')
        return transactions
      },
    }
  }, [ready, authenticated, solanaWallet, publicKey])

  // Create the AnchorProvider
  const provider = useMemo(() => {
    if (!wallet) {
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

  return {
    provider,
    connection,
    publicKey,
    solanaWallet,
    signAndSendTransaction,
    isReady: ready && authenticated && !!solanaWallet && !!publicKey,
  }
}

// For backward compatibility
export function usePrivyAnchorProviderLegacy() {
  const { provider } = usePrivyAnchorProvider()
  return provider
}
