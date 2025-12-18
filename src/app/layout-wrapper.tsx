'use client'

import { usePathname } from 'next/navigation'
import { ReactNode, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { Footer } from '@/components/footer'
import { Toaster } from 'react-hot-toast'
import { PrivyWalletButton } from '@/components/solana/privy-wallet-button'
import { ClusterUiSelect } from '@/components/cluster/cluster-ui'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { usePrivy } from '@privy-io/react-auth'

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { authenticated } = usePrivy()

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
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Left Side - Logo + Nav */}
            <div className="flex items-center gap-6 md:gap-8">
              <Link href="/" className="brutalist-title text-xl md:text-2xl text-foreground tracking-tighter hover:text-accent transition-colors">
                UTOPIA
              </Link>

              {/* Explore Link - Desktop */}
              <Link
                href="/voting"
                className={`hidden md:inline-flex text-sm font-bold uppercase tracking-wide transition-colors ${
                  pathname === '/voting' || pathname.startsWith('/voting/')
                    ? 'text-accent'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Explore
              </Link>
            </div>

            {/* Right Side - Actions */}
            <div className="flex items-center gap-3 md:gap-4">
              {/* Create Button - Desktop */}
              <Link
                href="/create-poll"
                className={`hidden md:inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition-all ${
                  pathname === '/create-poll'
                    ? 'bg-accent text-background border-2 border-accent'
                    : 'bg-accent text-background border-2 border-accent hover:bg-transparent hover:text-accent'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create
              </Link>

              {/* Wallet/Profile Button (includes credits) */}
              <PrivyWalletButton />

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-foreground hover:text-accent transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden border-t-2 border-border bg-card overflow-hidden"
            >
              <div className="px-6 py-4 space-y-2">
                <Link
                  href="/voting"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-3 px-4 text-sm font-bold uppercase tracking-wide transition-colors ${
                    pathname === '/voting' || pathname.startsWith('/voting/')
                      ? 'text-accent bg-accent/10'
                      : 'text-foreground hover:text-accent hover:bg-accent/5'
                  }`}
                >
                  Explore Polls
                </Link>

                <Link
                  href="/my-polls"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-3 px-4 text-sm font-bold uppercase tracking-wide transition-colors ${
                    pathname === '/my-polls'
                      ? 'text-accent bg-accent/10'
                      : 'text-foreground hover:text-accent hover:bg-accent/5'
                  }`}
                >
                  My Polls
                </Link>

                {/* Profile Link - Mobile (only when authenticated) */}
                {authenticated && (
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block py-3 px-4 text-sm font-bold uppercase tracking-wide transition-colors ${
                      pathname === '/profile'
                        ? 'text-accent bg-accent/10'
                        : 'text-foreground hover:text-accent hover:bg-accent/5'
                    }`}
                  >
                    Profile
                  </Link>
                )}

                {/* Create Button - Mobile */}
                <Link
                  href="/create-poll"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold uppercase tracking-wide transition-all mt-4 bg-accent text-background border-2 border-accent"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Poll
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
