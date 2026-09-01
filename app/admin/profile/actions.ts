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
