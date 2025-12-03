'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { useState, useEffect, useMemo } from 'react'
import { useVotingProgram } from '../voting/voting-data-access'
import { ProfileCard, ProfileEditForm, CreatedPollsList, VotedPollsList } from './profile-ui'
import { getOrCreateProfile, updateProfile, updateProfileAvatar } from '@/lib/profile-service'
import { UserProfile } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

export function ProfileFeature() {
  const { ready, authenticated, user, logout } = usePrivy()
  const { ready: walletsReady, wallets } = useWallets()
  const { getUserCreatedPolls, getUserVoteRecords, polls, getPollCandidates } = useVotingProgram()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'created' | 'voted'>('created')

  const solanaWallet = useMemo(() => {
    if (!ready || !authenticated || !walletsReady || wallets.length === 0) return null
    return wallets[0]
  }, [ready, authenticated, walletsReady, wallets])

  // Fetch or create profile when wallet is available
  useEffect(() => {
    const loadProfile = async () => {
      if (!solanaWallet?.address) {
        setIsLoading(false)
        return
      }

      try {
        const userEmail = user?.email?.address || undefined
        const userProfile = await getOrCreateProfile(solanaWallet.address, userEmail)
        setProfile(userProfile)
      } catch (error) {
        console.error('Error loading profile:', error)
        toast.error('Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [solanaWallet?.address, user?.email?.address])

  const handleUpdateProfile = async (data: { display_name?: string; bio?: string }) => {
    if (!solanaWallet?.address) return

    try {
      const updatedProfile = await updateProfile(solanaWallet.address, data)
      if (updatedProfile) {
        setProfile(updatedProfile)
        toast.success('Profile updated successfully')
        setIsEditing(false)
      } else {
        toast.error('Failed to update profile')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    }
  }

  const handleAvatarUpload = async (file: File) => {
    if (!solanaWallet?.address) return

    try {
      const { profile: updatedProfile, error } = await updateProfileAvatar(solanaWallet.address, file)
      if (error) {
        toast.error(error)
        return
      }
      if (updatedProfile) {
        setProfile(updatedProfile)
        toast.success('Avatar updated successfully')
      }
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('Failed to upload avatar')
    }
  }

  // Not authenticated state
  if (!authenticated || !solanaWallet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card border-2 border-border p-8 max-w-md w-full text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide mb-2">Login Required</h2>
          <p className="text-muted-foreground font-mono text-sm mb-6">
            Please login to view your profile
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-accent text-background font-bold text-sm uppercase tracking-wide border-2 border-accent hover:bg-accent/90 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground font-mono">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b-2 border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 md:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm font-mono">
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-foreground font-bold">Profile</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            {isEditing ? (
              <ProfileEditForm
                profile={profile}
                onSave={handleUpdateProfile}
                onCancel={() => setIsEditing(false)}
                onAvatarUpload={handleAvatarUpload}
              />
            ) : (
              <ProfileCard
                profile={profile}
                walletAddress={solanaWallet.address}
                onEdit={() => setIsEditing(true)}
                onLogout={logout}
              />
            )}
          </div>

          {/* Right Column - Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex border-2 border-border bg-card">
              <button
                onClick={() => setActiveTab('created')}
                className={`flex-1 px-6 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${
                  activeTab === 'created'
                    ? 'bg-accent text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Created Polls ({getUserCreatedPolls.data?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('voted')}
                className={`flex-1 px-6 py-4 text-sm font-bold uppercase tracking-wide transition-colors border-l-2 border-border ${
                  activeTab === 'voted'
                    ? 'bg-accent text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Voted In ({getUserVoteRecords.data?.length || 0})
              </button>
            </div>

            {/* Tab Content */}
            <div className="bg-card border-2 border-border p-6">
              {activeTab === 'created' ? (
                <CreatedPollsList
                  polls={getUserCreatedPolls.data || []}
                  isLoading={getUserCreatedPolls.isLoading}
                  getPollCandidates={getPollCandidates}
                />
              ) : (
                <VotedPollsList
                  voteRecords={getUserVoteRecords.data || []}
                  allPolls={polls.data || []}
                  isLoading={getUserVoteRecords.isLoading || polls.isLoading}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
