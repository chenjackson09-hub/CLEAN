'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendApplicationApproved, sendApplicationRejected } from '@/lib/resend'

type ActionResult = { error?: string }

async function requireAdmin(): Promise<{ error: string } | null> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }
  return null
}

export async function updateApplicationStatus(
  applicationId: string,
  cleanerId: string,
  status: 'approved' | 'rejected'
): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  const reviewer = await getCurrentUser()

  // Rejecting removes the cleaner's account entirely. Send the rejection email
  // first — once the auth user is deleted we can no longer look up their address.
  if (status === 'rejected') {
    await notifyApplicationDecision(admin, cleanerId, 'rejected').catch(() => {})
    const result = await hardDeleteCleaner(admin, cleanerId)
    if (result.error) return result
    revalidatePath('/admin/applications')
    revalidatePath('/admin/cleaners')
    return {}
  }

  const [appRes, cleanerRes] = await Promise.all([
    admin.from('cleaner_applications')
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: reviewer?.id ?? null })
      .eq('id', applicationId),
    admin.from('cleaners').update({ status }).eq('id', cleanerId),
  ])
  if (appRes.error) return { error: appRes.error.message }
  if (cleanerRes.error) return { error: cleanerRes.error.message }

  // Notify the cleaner of the decision — fire and forget, never block the action.
  notifyApplicationDecision(admin, cleanerId, status).catch(() => {})

  revalidatePath('/admin/applications')
  return {}
}

async function notifyApplicationDecision(
  admin: ReturnType<typeof createAdminClient>,
  cleanerId: string,
  status: 'approved' | 'rejected',
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
  } else {
    await sendApplicationRejected({ cleanerEmail, cleanerName })
  }
}

// Storage buckets that hold per-user files. Every file a user uploads is keyed
// under a `${userId}/` folder (see avatar/gallery uploads in the cleaner/customer
// actions), so wiping a user's storage means clearing that folder in each bucket.
const USER_STORAGE_BUCKETS = ['avatars', 'gallery'] as const

// Remove every storage object a user owns across all per-user buckets. Listing a
// folder that doesn't exist returns an empty array (not an error), so this is safe
// to call for any user regardless of which buckets they actually used.
async function deleteUserStorage(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<ActionResult> {
  for (const bucket of USER_STORAGE_BUCKETS) {
    const { data: files, error: listErr } = await admin.storage.from(bucket).list(userId)
    if (listErr) return { error: listErr.message }
    if (!files || files.length === 0) continue
    const paths = files.map((f) => `${userId}/${f.name}`)
    const { error: removeErr } = await admin.storage.from(bucket).remove(paths)
    if (removeErr) return { error: removeErr.message }
  }
  return {}
}

// Hard-delete a cleaner: wipe their storage, remove every row that FK-references
// the cleaner, then the cleaner/profile rows, then the auth user. Storage is
// cleared first so a failure aborts before any rows are gone; child tables are
// deleted before `cleaners`/`profiles` because they reference those rows.
async function hardDeleteCleaner(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
): Promise<ActionResult> {
  const storageResult = await deleteUserStorage(admin, id)
  if (storageResult.error) return storageResult

  const childDeletes = await Promise.all([
    admin.from('bookings').delete().eq('cleaner_id', id),
    admin.from('cleaner_availability').delete().eq('cleaner_id', id),
    admin.from('cleaner_weekly_availability').delete().eq('cleaner_id', id),
    admin.from('cleaner_gallery').delete().eq('cleaner_id', id),
    admin.from('cleaner_applications').delete().eq('cleaner_id', id),
  ])
  const childErr = childDeletes.find((r) => r.error)?.error
  if (childErr) return { error: childErr.message }

  const { error: cleanerErr } = await admin.from('cleaners').delete().eq('id', id)
  if (cleanerErr) return { error: cleanerErr.message }
  const { error: profErr } = await admin.from('profiles').delete().eq('id', id)
  if (profErr) return { error: profErr.message }
  const { error: authErr } = await admin.auth.admin.deleteUser(id)
  if (authErr) return { error: authErr.message }
  return {}
}

export async function deleteCleanerAdmin(id: string): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  const result = await hardDeleteCleaner(admin, id)
  if (result.error) return result
  revalidatePath('/admin/cleaners')
  return {}
}

export async function deleteCustomerAdmin(id: string): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  // Wipe storage first so a failure aborts before any rows are gone.
  const storageResult = await deleteUserStorage(admin, id)
  if (storageResult.error) return storageResult
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
