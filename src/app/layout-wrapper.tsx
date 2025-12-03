'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Toaster } from 'react-hot-toast'
import { PrivyWalletButton } from '@/components/solana/privy-wallet-button'
import { ClusterUiSelect } from '@/components/cluster/cluster-ui'

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // Landing page gets its own navigation
  if (pathname === '/') {
    return (
      <>
        {children}
        <Toaster position="bottom-right" />
      </>
    )
  }

  // All other pages use v0 Navigation style
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation */}
      <nav className="border-b-2 border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 md:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <a href="/" className="brutalist-title text-2xl text-foreground tracking-tighter hover:text-accent transition-colors">
              UTOPIA
            </a>

            {/* Center Links */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="/voting"
                className={`text-sm font-bold uppercase tracking-wide transition-colors ${
                  pathname === '/voting'
                    ? 'text-accent'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Voting
              </a>
              <a
                href="/create-poll"
                className={`text-sm font-bold uppercase tracking-wide transition-colors ${
                  pathname === '/create-poll'
                    ? 'text-accent'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Create Poll
              </a>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              <div className="hidden lg:block">
                <ClusterUiSelect />
              </div>
              <PrivyWalletButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer */}
      <Footer />

      <Toaster position="bottom-right" />
    </div>
  )
}
