'use server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type ActionResult = { error?: string }

export async function updateApplicationStatus(
  applicationId: string,
  cleanerId: string,
  status: 'approved' | 'rejected'
): Promise<ActionResult> {
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
  const admin = createAdminClient()
  const { error } = await admin.from('cleaners').update({ status: 'suspended' }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/cleaners')
  return {}
}

export async function deleteCustomerAdmin(id: string): Promise<ActionResult> {
  const admin = createAdminClient()
  const { error } = await admin.from('customers').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/customers')
  return {}
}
