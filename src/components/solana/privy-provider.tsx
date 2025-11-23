'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { ReactNode } from 'react'
import { useCluster } from '../cluster/cluster-data-access'

export function PrivySolanaProvider({ children }: { children: ReactNode }) {
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
      }}
    >
      {children}
    </PrivyProvider>
  )
}
