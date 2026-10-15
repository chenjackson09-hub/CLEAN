'use server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isLocationStatus, type LocationStatus } from '@/lib/locations'

type Result = { error?: string; success?: true; batch?: string; changed?: number }

const MAX_BULK = 500
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function requireAdminId(): Promise<{ id: string } | { error: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }
  return { id: user.id }
}

type Before = { override: boolean; is_active: boolean | null; status: LocationStatus | null; note: string | null }

// Opens/closes one or many localities. Writes an explicit override per locality
// (the one place availability is decided — see locality_effective_availability),
// and records the previous state in admin_action_log so the batch can be undone.
export async function setLocalityStatus(input: { ids: string[]; status: string }): Promise<Result> {
  const auth = await requireAdminId()
  if ('error' in auth) return auth
  if (!isLocationStatus(input.status)) return { error: 'Invalid status' }
  const ids = Array.from(new Set((input.ids ?? []).filter(i => typeof i === 'string' && UUID.test(i))))
  if (ids.length === 0) return { error: 'Nothing selected' }
  if (ids.length > MAX_BULK) return { error: `Select at most ${MAX_BULK} locations at a time` }

  const admin = createAdminClient()

  // Previous overrides (for undo). `status` only exists once migration 0040 ran.
  const { data: prevRows, error: prevError } = await admin
    .from('locality_overrides')
    .select('locality_id, is_active, status, note')
    .in('locality_id', ids)
    .returns<{ locality_id: string; is_active: boolean; status: LocationStatus | null; note: string | null }[]>()
  if (prevError) return { error: 'Locations are not set up yet — run migration 0040 first.' }
  const prev = new Map((prevRows ?? []).map(r => [r.locality_id, r]))

  const batch = randomUUID()
  const now = new Date().toISOString()
  const rows = ids.map(id => ({
    locality_id: id,
    is_active: input.status === 'open',
    status: input.status,
    updated_by: auth.id,
    updated_at: now,
  }))
  const { error: writeError } = await admin.from('locality_overrides').upsert(rows, { onConflict: 'locality_id' })
  if (writeError) return { error: 'Could not update the locations. Please try again.' }

  // Audit trail — best-effort: a logging failure never undoes the change.
  const log = ids.map(id => {
    const p = prev.get(id)
    const before: Before = p
      ? { override: true, is_active: p.is_active, status: p.status, note: p.note }
      : { override: false, is_active: null, status: null, note: null }
    return {
      admin_id: auth.id,
      target_type: 'locality',
      target_id: id,
      action: 'locality_status',
      payload: { batch, from: before, to: input.status },
    }
  })
  const { error: logError } = await admin.from('admin_action_log').insert(log)
  if (logError) console.error('[locations] audit log failed', logError.message)

  revalidatePath('/admin/locations')
  return { success: true, batch, changed: ids.length }
}

// Restores every locality changed in one batch to what it was before.
export async function undoLocalityChange(batch: string): Promise<Result> {
  const auth = await requireAdminId()
  if ('error' in auth) return auth
  if (!UUID.test(batch)) return { error: 'Invalid change' }

  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('admin_action_log')
    .select('id, target_id, payload')
    .eq('action', 'locality_status')
    .eq('payload->>batch', batch)
    .returns<{ id: string; target_id: string; payload: { from: Before; undone_at?: string } }[]>()
  const todo = (rows ?? []).filter(r => !r.payload?.undone_at)
  if (todo.length === 0) return { error: 'This change was already undone.' }

  const now = new Date().toISOString()
  const toDelete = todo.filter(r => !r.payload.from.override).map(r => r.target_id)
  const toRestore = todo
    .filter(r => r.payload.from.override)
    .map(r => ({
      locality_id: r.target_id,
      is_active: !!r.payload.from.is_active,
      status: r.payload.from.status ?? (r.payload.from.is_active ? 'open' : 'not_open'),
      note: r.payload.from.note,
      updated_by: auth.id,
      updated_at: now,
    }))

  if (toDelete.length) {
    const { error } = await admin.from('locality_overrides').delete().in('locality_id', toDelete)
    if (error) return { error: 'Could not undo the change.' }
  }
  if (toRestore.length) {
    const { error } = await admin.from('locality_overrides').upsert(toRestore, { onConflict: 'locality_id' })
    if (error) return { error: 'Could not undo the change.' }
  }

  // Mark each entry as undone (update by id — bulk status-style updates hang) and log the undo.
  for (const r of todo) {
    await admin.from('admin_action_log').update({ payload: { ...r.payload, undone_at: now } }).eq('id', r.id)
  }
  await admin.from('admin_action_log').insert(
    todo.map(r => ({
      admin_id: auth.id,
      target_type: 'locality',
      target_id: r.target_id,
      action: 'locality_status_undo',
      payload: { batch, original_log_id: r.id },
    })),
  )

  revalidatePath('/admin/locations')
  return { success: true, changed: todo.length }
}
