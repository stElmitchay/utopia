/**
 * Credits UI Components
 *
 * Display and purchase components for the credits system
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useUserCredits, usePurchaseCredits, useRefreshCredits } from './credits-data-access'
import { Coins, Plus, RefreshCw, Wallet, TrendingUp } from 'lucide-react'

// ============================================================================
// Credit Balance Display
// ============================================================================

export function CreditBalanceDisplay() {
  const { data: credits, isLoading, error } = useUserCredits()
  const { mutate: refresh, isPending: isRefreshing } = useRefreshCredits()

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-500">
        <Coins className="h-4 w-4" />
        <span className="text-sm">Error loading credits</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
        <Coins className="h-4 w-4" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  const balance = credits?.balance || 0

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
        <Coins className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">
          {balance.toLocaleString()} credits
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => refresh()}
        disabled={isRefreshing}
        className="h-8 w-8 p-0"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  )
}

// ============================================================================
// Credit Balance Card (Larger Display)
// ============================================================================

export function CreditBalanceCard() {
  const { data: credits, isLoading } = useUserCredits()
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)

  const balance = credits?.balance || 0

  return (
    <>
      <div className="bg-gradient-to-br from-primary/20 to-primary/5 p-6 rounded-lg border border-primary/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Your Balance</p>
            {isLoading ? (
              <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            ) : (
              <h2 className="text-4xl font-bold flex items-baseline gap-2">
                {balance.toLocaleString()}
                <span className="text-lg text-muted-foreground font-normal">credits</span>
              </h2>
            )}
          </div>
          <div className="bg-primary/10 p-3 rounded-full">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => setShowPurchaseModal(true)}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Buy Credits
          </Button>
        </div>

        {credits?.lastSync && (
          <p className="text-xs text-muted-foreground mt-4">
            Last synced: {new Date(credits.lastSync).toLocaleTimeString()}
          </p>
        )}
      </div>

      {showPurchaseModal && (
        <PurchaseCreditsModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
        />
      )}
    </>
  )
}

// ============================================================================
// Purchase Credits Modal
// ============================================================================

interface PurchaseCreditsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PurchaseCreditsModal({ isOpen, onClose }: PurchaseCreditsModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const { mutate: purchaseCredits, isPending } = usePurchaseCredits()

  if (!isOpen) return null

  const predefinedAmounts = [
    { amount: 100, label: '100 SLE' },
    { amount: 500, label: '500 SLE' },
    { amount: 1000, label: '1,000 SLE' },
    { amount: 5000, label: '5,000 SLE' }
  ]

  const handlePurchase = () => {
    const amount = selectedAmount || parseInt(customAmount)

    if (!amount || amount < 10) {
      alert('Minimum purchase is 10 SLE')
      return
    }

    purchaseCredits(amount)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border rounded-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Buy Credits</h2>
            <p className="text-sm text-muted-foreground mt-1">
              1 Sierra Leone Leone = 1 Credit
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* Predefined Amounts */}
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium">Quick Select</p>
          <div className="grid grid-cols-2 gap-3">
            {predefinedAmounts.map((option) => (
              <button
                key={option.amount}
                onClick={() => {
                  setSelectedAmount(option.amount)
                  setCustomAmount('')
                }}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  selectedAmount === option.amount
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-semibold">{option.amount} credits</div>
                <div className="text-xs text-muted-foreground">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium">Or Enter Custom Amount</p>
          <input
            type="number"
            placeholder="Enter amount (min 10 SLE)"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value)
              setSelectedAmount(null)
            }}
            className="w-full px-4 py-3 border rounded-lg bg-background"
            min="10"
          />
        </div>

        {/* Payment Methods Info */}
        <div className="bg-muted/50 p-4 rounded-lg mb-6">
          <p className="text-sm font-medium mb-2">Accepted Payment Methods</p>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-white font-bold text-xs">
                O
              </div>
              <span>Orange Money</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-white font-bold text-xs">
                A
              </div>
              <span>Afrimoney</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            className="flex-1"
            disabled={isPending || (!selectedAmount && !customAmount)}
          >
            {isPending ? 'Processing...' : 'Continue to Payment'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          You&apos;ll be redirected to complete your payment securely
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Insufficient Credits Warning
// ============================================================================

interface InsufficientCreditsWarningProps {
  required: number
  current: number
  action: string // e.g., "vote", "create poll"
  onPurchase?: () => void
}

export function InsufficientCreditsWarning({
  required,
  current,
  action,
  onPurchase
}: InsufficientCreditsWarningProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="bg-yellow-500/20 p-2 rounded-full flex-shrink-0">
            <Coins className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
              Insufficient Credits
            </h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
              You need {required} credits to {action}, but you only have {current}.
            </p>
            <Button
              size="sm"
              onClick={() => {
                if (onPurchase) {
                  onPurchase()
                } else {
                  setShowModal(true)
                }
              }}
              className="mt-3"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Buy {required - current} More Credits
            </Button>
          </div>
        </div>
      </div>

      {showModal && (
        <PurchaseCreditsModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

// ============================================================================
// Credit Cost Badge
// ============================================================================

interface CreditCostBadgeProps {
  cost: number
  label?: string
}

export function CreditCostBadge({ cost, label }: CreditCostBadgeProps) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-sm font-medium">
      <Coins className="h-3.5 w-3.5" />
      <span>{cost} credits</span>
      {label && <span className="text-muted-foreground">· {label}</span>}
    </div>
  )
}
