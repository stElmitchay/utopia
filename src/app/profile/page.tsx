import { Suspense } from 'react'
import { ProfileFeature } from '@/components/profile/profile-feature'

function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
        <p className="text-muted-foreground font-mono">Loading profile...</p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfileFeature />
    </Suspense>
  )
}
