'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
  const [appRes, cleanerRes] = await Promise.all([
    admin.from('cleaner_applications')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', applicationId),
    admin.from('cleaners').update({ status }).eq('id', cleanerId),
  ])
  if (appRes.error) return { error: appRes.error.message }
  if (cleanerRes.error) return { error: cleanerRes.error.message }
  revalidatePath('/admin/applications')
  return {}
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
  const { error } = await admin.from('customers').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/customers')
  return {}
}
