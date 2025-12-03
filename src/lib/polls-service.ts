import { supabase, PollMetadata } from './supabase'

/**
 * Create poll metadata after on-chain poll creation
 */
export async function createPollMetadata(
  pollId: number,
  creatorWallet: string,
  imageUrl?: string | null
): Promise<PollMetadata | null> {
  const { data, error } = await supabase
    .from('polls_metadata')
    .insert({
      poll_id: pollId,
      creator_wallet: creatorWallet,
      image_url: imageUrl || null,
      is_deleted: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating poll metadata:', error)
    return null
  }

  return data
}

/**
 * Get metadata for a single poll
 */
export async function getPollMetadata(pollId: number): Promise<PollMetadata | null> {
  const { data, error } = await supabase
    .from('polls_metadata')
    .select('*')
    .eq('poll_id', pollId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found - not an error, just no metadata yet
      return null
    }
    console.error('Error fetching poll metadata:', error)
    return null
  }

  return data
}

/**
 * Get metadata for multiple polls (batch fetch for poll list)
 */
export async function getPollsMetadata(pollIds: number[]): Promise<PollMetadata[]> {
  if (pollIds.length === 0) return []

  const { data, error } = await supabase
    .from('polls_metadata')
    .select('*')
    .in('poll_id', pollIds)

  if (error) {
    console.error('Error fetching polls metadata:', error)
    return []
  }

  return data || []
}

/**
 * Soft delete a poll (only creator can delete)
 */
export async function softDeletePoll(
  pollId: number,
  walletAddress: string
): Promise<boolean> {
  // First verify the wallet is the creator
  const { data: existing } = await supabase
    .from('polls_metadata')
    .select('creator_wallet')
    .eq('poll_id', pollId)
    .single()

  if (existing && existing.creator_wallet !== walletAddress) {
    console.error('Unauthorized: Only poll creator can delete')
    return false
  }

  // If no metadata exists yet, create it with is_deleted = true
  if (!existing) {
    const { error } = await supabase
      .from('polls_metadata')
      .insert({
        poll_id: pollId,
        creator_wallet: walletAddress,
        is_deleted: true,
      })

    if (error) {
      console.error('Error soft deleting poll:', error)
      return false
    }
    return true
  }

  // Update existing metadata
  const { error } = await supabase
    .from('polls_metadata')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('poll_id', pollId)

  if (error) {
    console.error('Error soft deleting poll:', error)
    return false
  }

  return true
}

/**
 * Restore a soft-deleted poll
 */
export async function restorePoll(
  pollId: number,
  walletAddress: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('polls_metadata')
    .select('creator_wallet')
    .eq('poll_id', pollId)
    .single()

  if (existing && existing.creator_wallet !== walletAddress) {
    console.error('Unauthorized: Only poll creator can restore')
    return false
  }

  const { error } = await supabase
    .from('polls_metadata')
    .update({ is_deleted: false, updated_at: new Date().toISOString() })
    .eq('poll_id', pollId)

  if (error) {
    console.error('Error restoring poll:', error)
    return false
  }

  return true
}

/**
 * Get list of deleted poll IDs
 */
export async function getDeletedPollIds(): Promise<number[]> {
  const { data, error } = await supabase
    .from('polls_metadata')
    .select('poll_id')
    .eq('is_deleted', true)

  if (error) {
    console.error('Error fetching deleted poll IDs:', error)
    return []
  }

  return data?.map(d => d.poll_id) || []
}

/**
 * Update poll image
 */
export async function updatePollImage(
  pollId: number,
  walletAddress: string,
  imageUrl: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('polls_metadata')
    .select('creator_wallet')
    .eq('poll_id', pollId)
    .single()

  if (existing && existing.creator_wallet !== walletAddress) {
    console.error('Unauthorized: Only poll creator can update image')
    return false
  }

  // If no metadata exists, create it
  if (!existing) {
    const { error } = await supabase
      .from('polls_metadata')
      .insert({
        poll_id: pollId,
        creator_wallet: walletAddress,
        image_url: imageUrl,
      })

    if (error) {
      console.error('Error updating poll image:', error)
      return false
    }
    return true
  }

  const { error } = await supabase
    .from('polls_metadata')
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('poll_id', pollId)

  if (error) {
    console.error('Error updating poll image:', error)
    return false
  }

  return true
}
