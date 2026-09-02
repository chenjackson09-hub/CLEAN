'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateAdminName(input: {
  first_name: string
  last_name: string
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const first = input.first_name.trim()
  const last = input.last_name.trim()
  const full_name = [first, last].filter(Boolean).join(' ')
  if (!full_name) return { error: 'nameRequired' }

  const { error } = await supabase.from('profiles').update({ full_name }).eq('id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/admin/profile')
  revalidatePath('/admin', 'layout')
  return { success: true }
}

export async function updateAdminAvatar(formData: FormData): Promise<{ error?: string; avatarUrl?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const avatarFile = formData.get('avatar') as File
  if (!avatarFile || avatarFile.size === 0) return { error: 'No file provided' }

  const ext = avatarFile.name.split('.').pop()
  const path = `${user.id}/avatar.${ext}`
  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
  if (uploadErr) return { error: uploadErr.message }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
  // The storage path is stable (upsert overwrites the same file), so the public
  // URL never changes between uploads — cache-bust it so the new photo shows.
  const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`

  const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)
  if (dbErr) return { error: dbErr.message }

  revalidatePath('/admin/profile')
  revalidatePath('/admin', 'layout')
  return { avatarUrl }
}
