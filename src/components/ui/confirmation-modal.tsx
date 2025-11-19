'use client'

import { ReactNode } from 'react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string | ReactNode
  confirmText?: string
  cancelText?: string
  confirmButtonClass?: string
  isLoading?: boolean
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'bg-white text-[#0A1A14] hover:bg-[#A3E4D7]',
  isLoading = false
}: ConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-[#3a6b5a] rounded-xl border-2 border-[#2c5446] shadow-2xl max-w-md w-full p-6 transform transition-all">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-bold text-[#F5F5DC] mb-2">
                {title}
              </h3>
              <div className="text-sm text-[#F5F5DC]/80">
                {message}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-transparent border-2 border-[#2c5446] text-[#F5F5DC] text-sm font-medium rounded-lg hover:bg-[#2c5446] transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#A3E4D7] disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-4 w-4 border-b-2 border-current rounded-full"></div>
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
