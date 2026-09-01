'use server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function redeemAdminInvite(input: {
  token: string
  email: string
  password: string
  full_name: string
}): Promise<{ error?: string; success?: boolean }> {
  const token = input.token?.trim()
  const email = input.email.trim()
  const full_name = input.full_name.trim()
  if (!token) return { error: 'Missing invite token.' }
  if (!email) return { error: 'Email is required.' }
  if (!full_name) return { error: 'Name is required.' }
  if (!input.password || input.password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }

  const admin = createAdminClient()

  const { data: invite, error: inviteErr } = await admin
    .from('admin_invites')
    .select('id, expires_at, used_at')
    .eq('token', token)
    .single()
  if (inviteErr || !invite) return { error: 'This invite link is invalid.' }
  if (invite.used_at) return { error: 'This invite link has already been used.' }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { error: 'This invite link has expired.' }
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { role: 'admin', full_name },
  })
  if (createErr || !created?.user) {
    return { error: createErr?.message ?? 'Could not create the account.' }
  }

  await admin
    .from('admin_invites')
    .update({ used_at: new Date().toISOString(), used_by: created.user.id })
    .eq('id', invite.id)

  return { success: true }
}
