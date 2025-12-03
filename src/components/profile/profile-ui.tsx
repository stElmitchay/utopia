'use client'

import { useState, useRef } from 'react'
import { UserProfile } from '@/lib/supabase'
import { ellipsify } from '../ui/ui-layout'
import Link from 'next/link'

interface ProfileCardProps {
  profile: UserProfile | null
  walletAddress: string
  onEdit: () => void
  onLogout: () => void
}

export function ProfileCard({ profile, walletAddress, onEdit, onLogout }: ProfileCardProps) {
  const [isCopied, setIsCopied] = useState(false)

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }

  return (
    <div className="bg-card border-2 border-border">
      {/* Avatar Section */}
      <div className="p-6 border-b-2 border-border">
        <div className="flex flex-col items-center">
          <div className="relative w-24 h-24 mb-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-full h-full bg-muted border-2 border-border flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>

          <h2 className="text-xl font-bold text-foreground uppercase tracking-wide text-center">
            {profile?.display_name || 'Anonymous User'}
          </h2>

          {profile?.bio && (
            <p className="text-sm text-muted-foreground font-mono text-center mt-2 max-w-xs">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Wallet Address */}
      <div className="p-4 border-b-2 border-border">
        <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-2">
          Wallet Address
        </div>
        <button
          onClick={handleCopyAddress}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-muted/20 border-2 border-border hover:border-accent transition-colors text-sm font-mono"
        >
          <span className="text-foreground truncate">{ellipsify(walletAddress, 8)}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 flex-shrink-0 ${isCopied ? 'text-accent' : 'text-muted-foreground'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isCopied ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            )}
          </svg>
        </button>
      </div>

      {/* Email (if available) */}
      {profile?.email && (
        <div className="p-4 border-b-2 border-border">
          <div className="text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-2">
            Email
          </div>
          <p className="text-sm text-foreground font-mono">{profile.email}</p>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 space-y-3">
        <button
          onClick={onEdit}
          className="w-full px-4 py-3 bg-accent text-background font-bold text-sm uppercase tracking-wide border-2 border-accent hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Profile
        </button>

        <button
          onClick={onLogout}
          className="w-full px-4 py-3 bg-transparent text-red-500 font-bold text-sm uppercase tracking-wide border-2 border-red-500/50 hover:border-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  )
}

interface ProfileEditFormProps {
  profile: UserProfile | null
  onSave: (data: { display_name?: string; bio?: string }) => Promise<void>
  onCancel: () => void
  onAvatarUpload: (file: File) => Promise<void>
}

export function ProfileEditForm({ profile, onSave, onCancel, onAvatarUpload }: ProfileEditFormProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave({
        display_name: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingAvatar(true)
    try {
      await onAvatarUpload(file)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  return (
    <div className="bg-card border-2 border-border">
      <div className="p-4 border-b-2 border-border">
        <h3 className="text-lg font-bold text-foreground uppercase tracking-wide">Edit Profile</h3>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Avatar Upload */}
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-2">
            Avatar
          </label>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 flex-shrink-0">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover border-2 border-border"
                />
              ) : (
                <div className="w-full h-full bg-muted border-2 border-border flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="px-4 py-2 bg-transparent text-foreground font-bold text-xs uppercase tracking-wide border-2 border-border hover:border-accent transition-colors disabled:opacity-50"
            >
              {isUploadingAvatar ? 'Uploading...' : 'Change Avatar'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-2">
            Max 5MB. JPEG, PNG, WebP, or GIF.
          </p>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your display name"
            className="w-full px-4 py-3 bg-muted/20 border-2 border-border text-foreground text-sm font-mono focus:outline-none focus:border-accent transition-colors placeholder-muted-foreground"
            maxLength={50}
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs text-muted-foreground uppercase tracking-wide font-mono font-bold mb-2">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself"
            rows={3}
            className="w-full px-4 py-3 bg-muted/20 border-2 border-border text-foreground text-sm font-mono focus:outline-none focus:border-accent transition-colors placeholder-muted-foreground resize-none"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground font-mono mt-1 text-right">
            {bio.length}/200
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-transparent text-foreground font-bold text-sm uppercase tracking-wide border-2 border-border hover:border-accent transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-accent text-background font-bold text-sm uppercase tracking-wide border-2 border-accent hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

interface CreatedPollsListProps {
  polls: any[]
  isLoading: boolean
  getPollCandidates: (pollId: number) => Promise<any[]>
}

export function CreatedPollsList({ polls, isLoading, getPollCandidates }: CreatedPollsListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (polls.length === 0) {
    return (
      <div className="text-center py-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-foreground font-bold uppercase tracking-wide mb-2">No Polls Created</p>
        <p className="text-muted-foreground font-mono text-sm mb-4">
          You haven&apos;t created any polls yet.
        </p>
        <Link
          href="/create-poll"
          className="inline-block px-6 py-3 bg-accent text-background font-bold text-sm uppercase tracking-wide border-2 border-accent hover:bg-accent/90 transition-colors"
        >
          Create Your First Poll
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {polls.map((pollAccount: any) => (
        <PollListItem
          key={pollAccount.publicKey.toString()}
          poll={pollAccount.account}
          getPollCandidates={getPollCandidates}
        />
      ))}
    </div>
  )
}

interface PollListItemProps {
  poll: any
  getPollCandidates: (pollId: number) => Promise<any[]>
}

function PollListItem({ poll, getPollCandidates }: PollListItemProps) {
  const getPollStatus = () => {
    const now = Math.floor(Date.now() / 1000)
    const startTime = poll.pollStart.toNumber()
    const endTime = poll.pollEnd.toNumber()

    if (now > endTime) return 'ENDED'
    if (now < startTime) return 'UPCOMING'
    return 'LIVE'
  }

  const status = getPollStatus()
  const pollId = poll.pollId.toString()

  return (
    <Link href={`/poll/${pollId}`}>
      <div className="border-2 border-border p-4 hover:border-accent transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h4 className="text-foreground font-bold uppercase tracking-wide truncate">
              {poll.description}
            </h4>
            <p className="text-muted-foreground font-mono text-xs mt-1">
              Poll #{pollId}
            </p>
          </div>
          <div className={`flex-shrink-0 px-2 py-1 border-2 font-bold text-xs uppercase tracking-wide ${
            status === 'LIVE' ? 'border-accent text-accent bg-accent/10' :
            status === 'ENDED' ? 'border-red-500 text-red-500 bg-red-500/10' :
            'border-yellow-500 text-yellow-500 bg-yellow-500/10'
          }`}>
            {status}
          </div>
        </div>
      </div>
    </Link>
  )
}

interface VotedPollsListProps {
  voteRecords: any[]
  allPolls: any[]
  isLoading: boolean
}

export function VotedPollsList({ voteRecords, allPolls, isLoading }: VotedPollsListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (voteRecords.length === 0) {
    return (
      <div className="text-center py-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-foreground font-bold uppercase tracking-wide mb-2">No Votes Cast</p>
        <p className="text-muted-foreground font-mono text-sm mb-4">
          You haven&apos;t voted in any polls yet.
        </p>
        <Link
          href="/voting"
          className="inline-block px-6 py-3 bg-accent text-background font-bold text-sm uppercase tracking-wide border-2 border-accent hover:bg-accent/90 transition-colors"
        >
          Browse Polls
        </Link>
      </div>
    )
  }

  // Match vote records with poll data
  const votedPolls = voteRecords.map((record: any) => {
    const pollId = record.account.pollId?.toNumber()
    const poll = allPolls.find((p: any) => p.account.pollId.toNumber() === pollId)
    return {
      record: record.account,
      poll: poll?.account,
      publicKey: poll?.publicKey,
    }
  }).filter(item => item.poll)

  return (
    <div className="space-y-4">
      {votedPolls.map((item: any, index: number) => (
        <VotedPollItem key={index} poll={item.poll} record={item.record} />
      ))}
    </div>
  )
}

interface VotedPollItemProps {
  poll: any
  record: any
}

function VotedPollItem({ poll, record }: VotedPollItemProps) {
  const getPollStatus = () => {
    const now = Math.floor(Date.now() / 1000)
    const startTime = poll.pollStart.toNumber()
    const endTime = poll.pollEnd.toNumber()

    if (now > endTime) return 'ENDED'
    if (now < startTime) return 'UPCOMING'
    return 'LIVE'
  }

  const status = getPollStatus()
  const pollId = poll.pollId.toString()

  return (
    <Link href={`/poll/${pollId}`}>
      <div className="border-2 border-border p-4 hover:border-accent transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h4 className="text-foreground font-bold uppercase tracking-wide truncate">
              {poll.description}
            </h4>
            <p className="text-muted-foreground font-mono text-xs mt-1">
              Poll #{pollId}
            </p>
          </div>
          <div className={`flex-shrink-0 px-2 py-1 border-2 font-bold text-xs uppercase tracking-wide ${
            status === 'LIVE' ? 'border-accent text-accent bg-accent/10' :
            status === 'ENDED' ? 'border-red-500 text-red-500 bg-red-500/10' :
            'border-yellow-500 text-yellow-500 bg-yellow-500/10'
          }`}>
            {status}
          </div>
        </div>
      </div>
    </Link>
  )
}
