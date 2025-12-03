'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { ellipsify } from '../ui/ui-layout'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

export function PrivyWalletButton() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { ready: walletsReady, wallets } = useWallets()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get the Solana embedded wallet
  const solanaWallet = useMemo(() => {
    console.log('===== PRIVY WALLET DEBUG =====')
    console.log('Privy ready:', ready)
    console.log('Authenticated:', authenticated)
    console.log('Wallets ready:', walletsReady)
    console.log('Wallets count:', wallets.length)
    console.log('All wallets:', wallets)
    console.log('User:', user)
    console.log('==============================')

    // For Solana wallets from useWallets hook, just get the first one (should be embedded wallet)
    const wallet = wallets[0]
    console.log('Selected wallet:', wallet)
    return wallet
  }, [ready, authenticated, walletsReady, wallets, user])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLoginClick = useCallback(() => {
    login()
  }, [login])

  const handleLogoutClick = useCallback(() => {
    logout()
    setShowDropdown(false)
  }, [logout])

  const formattedAddress = useMemo(() => {
    if (!solanaWallet?.address) return null
    return ellipsify(solanaWallet.address)
  }, [solanaWallet])

  if (!ready) {
    return (
      <button
        disabled
        className="inline-flex items-center justify-center p-2.5 bg-accent/50 text-background cursor-not-allowed border-2 border-accent"
      >
        <div className="animate-spin h-5 w-5 border-2 border-background border-t-transparent rounded-full"></div>
      </button>
    )
  }

  // Not authenticated - show login button
  if (!authenticated) {
    return (
      <button
        onClick={handleLoginClick}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-wide bg-transparent text-foreground hover:text-accent border-2 border-border hover:border-accent transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        <span className="hidden sm:inline">Login</span>
      </button>
    )
  }

  // Authenticated - show profile button with dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="inline-flex items-center justify-center gap-2 p-2 bg-accent/10 text-accent border-2 border-accent/30 hover:border-accent transition-colors"
      >
        {/* Profile Icon */}
        <div className="w-6 h-6 bg-accent text-background flex items-center justify-center text-xs font-bold">
          {user?.email?.address?.[0]?.toUpperCase() || solanaWallet?.address?.[0]?.toUpperCase() || 'U'}
        </div>
        <svg
          className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-card border-2 border-border z-50"
          >
            {/* User Info Header */}
            <div className="px-4 py-3 border-b-2 border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent text-background flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {user?.email?.address?.[0]?.toUpperCase() || solanaWallet?.address?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  {user?.email && (
                    <p className="text-sm text-foreground font-medium truncate">
                      {user.email.address}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {formattedAddress}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                href="/my-polls"
                onClick={() => setShowDropdown(false)}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wide text-foreground hover:bg-accent/10 transition-colors"
              >
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                My Polls
              </Link>

              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wide text-foreground hover:bg-accent/10 transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(solanaWallet?.address || '')
                  setShowDropdown(false)
                }}
              >
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Address
              </button>
            </div>

            {/* Logout */}
            <div className="border-t-2 border-border py-1">
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wide text-destructive hover:bg-destructive/10 transition-colors"
                onClick={handleLogoutClick}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
