'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { ReactNode } from 'react'
import { useCluster } from '../cluster/cluster-data-access'

export function PrivySolanaProvider({ children }: { children: ReactNode }) {
  const { cluster } = useCluster()

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#A3E4D7',
          logo: '/favicon.svg',
        },
        loginMethods: ['email', 'wallet'],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false,
        },
        supportedChains: [
          {
            id: cluster.network === 'devnet' ? 103 : cluster.network === 'mainnet-beta' ? 101 : 102,
            name: cluster.name,
            network: cluster.network || 'devnet',
            nativeCurrency: {
              name: 'SOL',
              symbol: 'SOL',
              decimals: 9,
            },
            rpcUrls: {
              default: {
                http: [cluster.endpoint],
              },
            },
          },
        ],
        defaultChain: {
          id: cluster.network === 'devnet' ? 103 : cluster.network === 'mainnet-beta' ? 101 : 102,
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}
