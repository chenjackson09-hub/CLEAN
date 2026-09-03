'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'
import { sendApplicationApproved, sendApplicationRejected, sendApplicationNeedsInfo } from '@/lib/resend'

type ActionResult = { error?: string }

async function requireAdmin(): Promise<{ error: string } | null> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }
  return null
}

// Snapshot a removed/rejected user onto the block list. Best-effort: a failure
// here (e.g. the migration hasn't run yet) must never block the delete/reject.
// Upserts on email so blocking the same person twice updates rather than dupes.
async function recordBlockedUser(
  admin: ReturnType<typeof createAdminClient>,
  entry: { id: string; role: 'cleaner' | 'customer'; reason: 'deleted' | 'rejected' },
) {
  const [{ data: authUser }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(entry.id),
    admin.from('profiles').select('full_name, phone').eq('id', entry.id).single(),
  ])
  await admin.from('blocked_users').upsert(
    {
      name: profile?.full_name ?? null,
      email: authUser?.user?.email ?? null,
      phone: profile?.phone ?? null,
      role: entry.role,
      reason: entry.reason,
      blocked_at: new Date().toISOString(),
    },
    { onConflict: 'email' },
  )
}

export async function unblockUser(id: string): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  const { error } = await admin.from('blocked_users').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/blocked')
  return {}
}

// cleaner_applications.status (pending/approved/rejected/needs_info) and
// cleaners.status (pending/approved/rejected/suspended) are separate enums;
// approving/rejecting an application maps onto the matching cleaner status.
const CLEANER_STATUS_FOR_DECISION = { approved: 'approved', rejected: 'rejected' } as const

export async function updateApplicationStatus(
  applicationId: string,
  cleanerId: string,
  status: 'approved' | 'rejected' | 'needs_info',
  notes?: string,
): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  const reviewer = await getCurrentUser()
  const appUpdate: Record<string, unknown> = { status, reviewed_at: new Date().toISOString(), reviewed_by: reviewer?.id ?? null }
  if (notes !== undefined) appUpdate.admin_notes = notes

  const updates = [
    admin.from('cleaner_applications').update(appUpdate).eq('id', applicationId),
  ]
  // "Needs info" parks the application without touching the cleaner's own status —
  // they're not approved or blocked, just waiting on more info.
  if (status === 'approved' || status === 'rejected') {
    updates.push(admin.from('cleaners').update({ status: CLEANER_STATUS_FOR_DECISION[status] }).eq('id', cleanerId))
  }
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) return { error: failed.error.message }

  // A rejected applicant goes on the block list (identity captured while the
  // profile still exists). Best-effort — don't fail the rejection over it.
  if (status === 'rejected') {
    await recordBlockedUser(admin, { id: cleanerId, role: 'cleaner', reason: 'rejected' }).catch(() => {})
    revalidatePath('/admin/blocked')
  }

  // Notify the cleaner of the decision — fire and forget, never block the action.
  notifyApplicationDecision(admin, cleanerId, status, notes).catch(() => {})

  revalidatePath('/admin/applications')
  return {}
}

async function notifyApplicationDecision(
  admin: ReturnType<typeof createAdminClient>,
  cleanerId: string,
  status: 'approved' | 'rejected' | 'needs_info',
  notes?: string,
) {
  const [{ data: cleanerAuth }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(cleanerId),
    admin.from('profiles').select('full_name').eq('id', cleanerId).single(),
  ])
  const cleanerEmail = cleanerAuth?.user?.email
  if (!cleanerEmail) return
  const cleanerName = profile?.full_name ?? 'there'

  if (status === 'approved') {
    await sendApplicationApproved({ cleanerEmail, cleanerName })
  } else if (status === 'needs_info') {
    await sendApplicationNeedsInfo({ cleanerEmail, cleanerName, notes })
  } else {
    await sendApplicationRejected({ cleanerEmail, cleanerName, notes })
  }
}

export async function updateApplicationNotes(applicationId: string, notes: string): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  const { error } = await admin.from('cleaner_applications').update({ admin_notes: notes }).eq('id', applicationId)
  if (error) return { error: error.message }
  revalidatePath('/admin/applications')
  return {}
}

// The customer-side analog of updateApplicationStatus — customers have no
// separate "applications" table (no cleaner_applications equivalent), so
// this writes straight to customers.status/status_reviewed_at. No "needs
// info" state and no email notification yet (cleaners' rejected path also
// records a blocked_users snapshot; customers don't, since a rejected
// customer's account still exists and can be reconsidered later, unlike a
// rejected cleaner application which is a one-shot decision).
export async function updateCustomerApprovalStatus(
  customerId: string,
  status: 'approved' | 'rejected',
  notes?: string,
): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  const update: Record<string, unknown> = { status, status_reviewed_at: new Date().toISOString() }
  if (notes !== undefined) update.admin_notes = notes
  const { error } = await admin.from('customers').update(update).eq('id', customerId)
  if (error) return { error: error.message }
  revalidatePath('/admin/applications')
  revalidatePath('/admin/customers')
  return {}
}

export async function updateCustomerNotes(customerId: string, notes: string): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  const { error } = await admin.from('customers').update({ admin_notes: notes }).eq('id', customerId)
  if (error) return { error: error.message }
  revalidatePath('/admin/applications')
  revalidatePath('/admin/customers')
  return {}
}

export async function deleteCleanerAdmin(id: string): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  // Snapshot identity onto the block list before suspending.
  await recordBlockedUser(admin, { id, role: 'cleaner', reason: 'deleted' }).catch(() => {})
  const { error } = await admin.from('cleaners').update({ status: 'suspended' }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/cleaners')
  revalidatePath('/admin/blocked')
  return {}
}

export async function deleteCustomerAdmin(id: string): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  // Snapshot identity onto the block list BEFORE the profile + auth user are
  // hard-deleted below (afterwards the name/email/phone are gone for good).
  await recordBlockedUser(admin, { id, role: 'customer', reason: 'deleted' }).catch(() => {})
  // Delete bookings first — bookings.customer_id FK references profiles.id
  const { error: bookErr } = await admin.from('bookings').delete().eq('customer_id', id)
  if (bookErr) return { error: bookErr.message }
  const [custRes, profRes] = await Promise.all([
    admin.from('customers').delete().eq('id', id),
    admin.from('profiles').delete().eq('id', id),
  ])
  if (custRes.error) return { error: custRes.error.message }
  if (profRes.error) return { error: profRes.error.message }
  const { error: authErr } = await admin.auth.admin.deleteUser(id)
  if (authErr) return { error: authErr.message }
  revalidatePath('/admin/customers')
  revalidatePath('/admin/blocked')
  return {}
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export async function createAdminInvite(): Promise<{ id?: string; token?: string; expiresAt?: string; error?: string }> {
  const authError = await requireAdmin()
  if (authError) return authError
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  const admin = createAdminClient()
  const token = randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString()
  const { data, error } = await admin
    .from('admin_invites')
    .insert({ token, created_by: user.id, expires_at: expiresAt })
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath('/admin/admins')
  return { id: data.id, token, expiresAt }
}

export async function revokeAdminInvite(id: string): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  const { error } = await admin.from('admin_invites').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/admins')
  return {}
}

export async function resolveSupportMessage(id: string): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  const { error } = await admin.from('support_messages').update({ resolved: true }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/support')
  return {}
}
