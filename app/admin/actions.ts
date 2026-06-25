'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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

// cleaner_applications.status (pending/approved/rejected/needs_info) and
// cleaners.status (new/active/in_training/inactive/blocked) are different
// enums — approving/rejecting an application maps to a different cleaner status.
const CLEANER_STATUS_FOR_DECISION = { approved: 'active', rejected: 'blocked' } as const

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

export async function deleteCleanerAdmin(id: string): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  const { error } = await admin.from('cleaners').update({ status: 'blocked' }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/cleaners')
  return {}
}

export async function deleteCustomerAdmin(id: string): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
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
  return {}
}
