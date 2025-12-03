'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { ellipsify } from '../ui/ui-layout'
import { motion } from 'framer-motion'

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

  const buttonContent = useMemo(() => {
    if (!ready) {
      return (
        <div className="flex items-center">
          <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-background"></div>
          <span>Loading...</span>
        </div>
      )
    }

    if (authenticated && solanaWallet) {
      return (
        <div className="flex items-center">
          <div className="w-2 h-2 bg-background mr-2"></div>
          <span>{formattedAddress}</span>
        </div>
      )
    }

    return (
      <div className="flex items-center">
        <span>Login with Email</span>
      </div>
    )
  }, [ready, authenticated, solanaWallet, formattedAddress])

  if (!ready) {
    return (
      <button
        disabled
        className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold uppercase tracking-wide bg-accent/50 text-background cursor-not-allowed border-2 border-accent"
      >
        {buttonContent}
      </button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`inline-flex items-center justify-center px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors border-2 ${
          authenticated
            ? 'bg-accent text-background hover:bg-accent/90 border-accent'
            : 'bg-accent text-background hover:bg-accent/90 border-accent'
        }`}
        onClick={authenticated ? () => setShowDropdown(!showDropdown) : handleLoginClick}
      >
        {buttonContent}
        {authenticated && (
          <svg
            className={`ml-2 h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {showDropdown && authenticated && (
        <div className="absolute right-0 mt-2 w-56 bg-card border-2 border-border z-50">
          {user?.email && (
            <div className="px-4 py-3 text-xs text-muted-foreground border-b-2 border-border font-mono">
              {user.email.address}
            </div>
          )}
          <button
            className="flex w-full items-center px-4 py-3 text-sm font-bold uppercase tracking-wide text-foreground hover:bg-accent/10 transition-colors"
            onClick={handleLogoutClick}
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      )}
    </div>
  )
}
