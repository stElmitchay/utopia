import { supabase } from './supabase'

const POLL_IMAGES_BUCKET = 'poll-images'
const AVATARS_BUCKET = 'avatars'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * Validate file before upload
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size must be less than 5MB' }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'File must be JPEG, PNG, WebP, or GIF' }
  }

  return { valid: true }
}

/**
 * Generate unique filename for uploads
 */
function generateFilename(pollId: number | string, file: File): string {
  const ext = file.name.split('.').pop() || 'jpg'
  const timestamp = Date.now()
  return `${pollId}-${timestamp}.${ext}`
}

/**
 * Upload poll image to Supabase Storage
 */
export async function uploadPollImage(
  pollId: number,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const validation = validateFile(file)
  if (!validation.valid) {
    return { url: null, error: validation.error || 'Invalid file' }
  }

  const filename = generateFilename(pollId, file)
  const filePath = `polls/${filename}`

  const { error: uploadError } = await supabase.storage
    .from(POLL_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Error uploading poll image:', uploadError)
    return { url: null, error: uploadError.message }
  }

  // Get public URL
  const { data } = supabase.storage
    .from(POLL_IMAGES_BUCKET)
    .getPublicUrl(filePath)

  return { url: data.publicUrl, error: null }
}

/**
 * Upload avatar image to Supabase Storage
 */
export async function uploadAvatar(
  walletAddress: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const validation = validateFile(file)
  if (!validation.valid) {
    return { url: null, error: validation.error || 'Invalid file' }
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const timestamp = Date.now()
  const filename = `${walletAddress.slice(0, 8)}-${timestamp}.${ext}`
  const filePath = `avatars/${filename}`

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    console.error('Error uploading avatar:', uploadError)
    return { url: null, error: uploadError.message }
  }

  const { data } = supabase.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(filePath)

  return { url: data.publicUrl, error: null }
}

/**
 * Delete an image from storage
 */
export async function deleteImage(
  bucket: 'poll-images' | 'avatars',
  imageUrl: string
): Promise<boolean> {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split(`/${bucket}/`)
    if (pathParts.length < 2) return false

    const filePath = pathParts[1]

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      console.error('Error deleting image:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('Error parsing image URL:', err)
    return false
  }
}
