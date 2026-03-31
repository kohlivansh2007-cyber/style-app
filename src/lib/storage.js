import { supabase } from '../supabaseClient'

export const CLIENT_PHOTOS_BUCKET = 'client-photos'

/**
 * Returns the public URL for a stored client photo.
 */
export function getClientPhotoUrl(photoPath) {
  if (!photoPath || typeof photoPath !== 'string') return null
  const { data } = supabase.storage
    .from(CLIENT_PHOTOS_BUCKET)
    .getPublicUrl(photoPath)
  return data?.publicUrl ?? null
}

/**
 * Uploads a client photo to Supabase Storage.
 * Bucket must already exist in the Supabase dashboard with correct RLS policies.
 * Returns { path } on success or { error } on failure.
 */
export async function uploadClientPhoto(stylistId, clientId, file) {
  if (!file) return { error: 'No file provided.' }

  // Validate file type client-side before uploading
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Invalid file type. Please upload a JPEG, PNG, WebP, or GIF.' }
  }

  // Validate file size client-side (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'File too large. Maximum size is 5MB.' }
  }

  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${stylistId}/${clientId}/avatar.${ext}` 

  const { error } = await supabase.storage
    .from(CLIENT_PHOTOS_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    })

  if (error) {
    console.error('[Storage] Upload error:', error)
    return { error: error.message }
  }

  console.log('[Storage] Upload success:', path)
  return { path }
}
