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

export async function deleteCleanerAdmin(id: string): Promise<ActionResult> {
  const authError = await requireAdmin()
  if (authError) return authError
  const admin = createAdminClient()
  const { error } = await admin.from('cleaners').update({ status: 'suspended' }).eq('id', id)
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
