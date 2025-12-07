import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not set. Some features may not work.')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

// Types for our database tables
export interface UserProfile {
  id: string
  wallet_address: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface PollMetadata {
  id: string
  poll_id: number
  creator_wallet: string
  image_url: string | null
  credits_per_vote: number
  is_deleted: boolean
  created_at: string
  updated_at: string
}
