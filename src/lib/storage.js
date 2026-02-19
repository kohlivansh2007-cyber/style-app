import { supabase } from '../supabaseClient'

export const CLIENT_PHOTOS_BUCKET = 'client-photos'

export function getClientPhotoUrl(photoPath) {
  if (!photoPath || typeof photoPath !== 'string') return null
  const { data } = supabase.storage.from(CLIENT_PHOTOS_BUCKET).getPublicUrl(photoPath)
  return data?.publicUrl ?? null
}

export async function uploadClientPhoto(stylistId, clientId, file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${stylistId}/${clientId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from(CLIENT_PHOTOS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) return { error: error.message }
  return { path }
}
