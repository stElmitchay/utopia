'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { ReactNode, useMemo } from 'react'
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'

// Use environment variable or default to devnet
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
const SOLANA_WSS_URL = SOLANA_RPC_URL.replace('https://', 'wss://').replace('http://', 'ws://')

export function PrivySolanaProvider({ children }: { children: ReactNode }) {
  // Configure RPCs for Privy's embedded wallet
  // Note: Pass URLs directly without wrapping in devnet()/mainnet() functions
  const solanaRpcs = useMemo(() => ({
    'solana:devnet': {
      rpc: createSolanaRpc(SOLANA_RPC_URL),
      rpcSubscriptions: createSolanaRpcSubscriptions(SOLANA_WSS_URL),
    },
    'solana:mainnet': {
      // Required by Privy even if not used - provide a working endpoint
      rpc: createSolanaRpc('https://api.mainnet-beta.solana.com'),
      rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.mainnet-beta.solana.com'),
    },
  }), [])

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#A3E4D7',
          logo: '/favicon.svg',
        },
        loginMethods: ['email'],
        embeddedWallets: {
          solana: {
            createOnLogin: 'all-users',
          },
        },
        solana: {
          rpcs: solanaRpcs,
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
