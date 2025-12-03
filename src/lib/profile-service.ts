import { supabase, UserProfile } from './supabase'
import { uploadAvatar, deleteImage } from './storage-service'

export interface ProfileUpdateData {
  display_name?: string
  bio?: string
  email?: string
}

/**
 * Get user profile by wallet address
 */
export async function getProfile(walletAddress: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No profile found
      return null
    }
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

/**
 * Create a new user profile
 */
export async function createProfile(
  walletAddress: string,
  data?: ProfileUpdateData
): Promise<UserProfile | null> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .insert({
      wallet_address: walletAddress,
      display_name: data?.display_name || null,
      bio: data?.bio || null,
      email: data?.email || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating profile:', error)
    return null
  }

  return profile
}

/**
 * Update user profile
 */
export async function updateProfile(
  walletAddress: string,
  data: ProfileUpdateData
): Promise<UserProfile | null> {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', walletAddress)
    .select()
    .single()

  if (error) {
    console.error('Error updating profile:', error)
    return null
  }

  return profile
}

/**
 * Get or create profile (ensures profile exists)
 */
export async function getOrCreateProfile(
  walletAddress: string,
  email?: string
): Promise<UserProfile | null> {
  let profile = await getProfile(walletAddress)

  if (!profile) {
    profile = await createProfile(walletAddress, { email })
  }

  return profile
}

/**
 * Update profile avatar
 */
export async function updateProfileAvatar(
  walletAddress: string,
  file: File
): Promise<{ profile: UserProfile | null; error: string | null }> {
  // First, get existing profile to check for old avatar
  const existingProfile = await getProfile(walletAddress)

  // Upload new avatar
  const { url, error: uploadError } = await uploadAvatar(walletAddress, file)

  if (uploadError || !url) {
    return { profile: null, error: uploadError || 'Failed to upload avatar' }
  }

  // Delete old avatar if exists
  if (existingProfile?.avatar_url) {
    await deleteImage('avatars', existingProfile.avatar_url)
  }

  // Update profile with new avatar URL
  let profile: UserProfile | null

  if (existingProfile) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        avatar_url: url,
        updated_at: new Date().toISOString(),
      })
      .eq('wallet_address', walletAddress)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile avatar:', error)
      return { profile: null, error: error.message }
    }
    profile = data
  } else {
    // Create new profile with avatar
    profile = await createProfile(walletAddress)
    if (profile) {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: url })
        .eq('wallet_address', walletAddress)
        .select()
        .single()

      if (error) {
        console.error('Error setting avatar on new profile:', error)
      } else {
        profile = data
      }
    }
  }

  return { profile, error: null }
}

/**
 * Get multiple profiles by wallet addresses (for displaying creator info)
 */
export async function getProfiles(walletAddresses: string[]): Promise<UserProfile[]> {
  if (walletAddresses.length === 0) return []

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .in('wallet_address', walletAddresses)

  if (error) {
    console.error('Error fetching profiles:', error)
    return []
  }

  return data || []
}
