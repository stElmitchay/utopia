import './globals.css'
import {ClusterProvider} from '@/components/cluster/cluster-data-access'
import {UiLayout} from '@/components/ui/ui-layout'
import {ReactQueryProvider} from './react-query-provider'
import {PrivySolanaProvider} from '@/components/solana/privy-provider'

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

// Navigation links
const links: { label: string; path: string }[] = [
  { label: 'Home', path: '/' },
  { label: 'Voting', path: '/voting' },
  { label: 'Create Poll', path: '/create-poll' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReactQueryProvider>
          <ClusterProvider>
            <PrivySolanaProvider>
              <UiLayout links={links}>{children}</UiLayout>
            </PrivySolanaProvider>
          </ClusterProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
