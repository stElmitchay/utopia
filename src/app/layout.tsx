import './globals.css'
import {ClusterProvider} from '@/components/cluster/cluster-data-access'
import {ReactQueryProvider} from './react-query-provider'
import {PrivySolanaProvider} from '@/components/solana/privy-provider'
import {LayoutWrapper} from './layout-wrapper'

export const metadata = {
  title: 'Utopia - Decentralized Voting',
  description: 'Create and participate in polls on the Solana blockchain',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: [
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ]
  },
  manifest: '/manifest.json',
  themeColor: '#2c5446',
  viewport: 'width=device-width, initial-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Utopia'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <ReactQueryProvider>
          <ClusterProvider>
            <PrivySolanaProvider>
              <LayoutWrapper>{children}</LayoutWrapper>
            </PrivySolanaProvider>
          </ClusterProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
