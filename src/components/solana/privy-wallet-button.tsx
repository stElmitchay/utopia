'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { ellipsify } from '../ui/ui-layout'
import { motion } from 'framer-motion'

export function PrivyWalletButton() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get the Solana embedded wallet
  const solanaWallet = useMemo(() => {
    return wallets.find((wallet) => wallet.walletClientType === 'privy' && wallet.chainType === 'solana')
  }, [wallets])

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
          <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-[#0A1A14] rounded-full"></div>
          <span>Loading...</span>
        </div>
      )
    }

    if (authenticated && solanaWallet) {
      return (
        <div className="flex items-center">
          <div className="w-2 h-2 bg-[#A3E4D7] rounded-full mr-2"></div>
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
        className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-[#A3E4D7]/50 text-[#0A1A14] cursor-not-allowed"
      >
        {buttonContent}
      </button>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#A3E4D7] ${
          authenticated
            ? 'bg-[#143D28] text-[#F5F5F5] hover:bg-[#1E4D38] border border-[#A3E4D7]/30'
            : 'bg-[#A3E4D7] text-[#0A1A14] hover:bg-[#8CD0C3]'
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
      </motion.button>

      {showDropdown && authenticated && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-0 mt-2 w-48 rounded-md bg-[#143D28] py-1 shadow-lg ring-1 ring-[#A3E4D7]/20 z-10"
        >
          {user?.email && (
            <div className="px-4 py-2 text-xs text-[#F5F5F5]/60 border-b border-[#A3E4D7]/10">
              {user.email.address}
            </div>
          )}
          <motion.button
            whileHover={{ backgroundColor: 'rgba(163, 228, 215, 0.1)' }}
            className="flex w-full items-center px-4 py-2 text-sm text-[#F5F5F5] hover:bg-[#A3E4D7]/10"
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
          </motion.button>
        </motion.div>
      )}
    </div>
  )
}
