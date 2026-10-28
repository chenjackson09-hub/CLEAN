'use server'
import { revalidatePath } from 'next/cache'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify } from '@/lib/notifications'

type Result = { error?: string; success?: true; verifiedAt?: string | null }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// "Cindy Verify" a cleaner or a host — or take the badge away. This is the ONLY place a
// verified mark is ever written, and only an admin can call it: nobody is verified
// automatically, and approval of an account is a separate thing. It records who did it and
// when (the audit log keeps the history), and tells the person through the bell.
export async function setCindyVerified(input: { kind: 'cleaner' | 'customer'; id: string; verified: boolean }): Promise<Result> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return { error: 'Unauthorized' }

  if (input.kind !== 'cleaner' && input.kind !== 'customer') return { error: 'Invalid person' }
  if (!UUID.test(input.id ?? '')) return { error: 'Invalid person' }

  const table = input.kind === 'cleaner' ? 'cleaners' : 'customers'
  const admin = createAdminClient()

  const { data: row, error: readError } = await admin.from(table).select('id, cindy_verified_at').eq('id', input.id).maybeSingle<{ id: string; cindy_verified_at: string | null }>()
  if (readError) return { error: 'Verification is not set up yet — run the latest migration first.' }
  if (!row) return { error: 'Person not found' }

  const wasVerified = !!row.cindy_verified_at
  if (wasVerified === input.verified) return { success: true, verifiedAt: row.cindy_verified_at } // nothing to change

  const verifiedAt = input.verified ? new Date().toISOString() : null
  const { error } = await admin
    .from(table)
    .update({ cindy_verified_at: verifiedAt, cindy_verified_by: input.verified ? user.id : null })
    .eq('id', input.id)
  if (error) return { error: 'Could not update. Please try again.' }

  const { error: logError } = await admin.from('admin_action_log').insert({
    admin_id: user.id,
    target_type: input.kind,
    target_id: input.id,
    action: input.verified ? 'cindy_verify' : 'cindy_unverify',
    payload: { previous: row.cindy_verified_at },
  })
  if (logError) console.error('[verification] audit log failed', logError.message)

  // Tell the person (best-effort, once). Taking the badge away is silent.
  if (input.verified) {
    await notify(admin, {
      userId: input.id,
      kind: 'cindy_verified',
      href: input.kind === 'cleaner' ? '/cleaner/preview' : '/profile',
      dedupeKey: `cindy_verified:${input.id}`,
    })
  }

  revalidatePath('/admin/cleaners')
  revalidatePath('/admin/customers')
  revalidatePath('/admin/applications')
  return { success: true, verifiedAt }
}
