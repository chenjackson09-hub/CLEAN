'use server'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notify, type NotifyInput } from '@/lib/notifications'
import { isSetStatus } from '@/lib/locations'

type Result = { error?: string; success?: true; batch?: string; changed?: number; notified?: number; regionId?: string }

const MAX_BULK = 500
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const cleanIds = (ids: unknown): string[] =>
  Array.from(new Set((Array.isArray(ids) ? ids : []).filter((i): i is string => typeof i === 'string' && UUID.test(i))))

async function requireAdminId(): Promise<{ id: string } | { error: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Unauthorized' }
  return { id: user.id }
}

type Before = { override: boolean; is_active: boolean | null; status: string | null; note: string | null }

// ── helpers ────────────────────────────────────────────────────────────────
// Which of these localities are open right now (own setting → region → closed).
async function openMap(admin: SupabaseClient, ids: string[]): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await admin.from('locality_effective_availability').select('locality_id, is_active').in('locality_id', ids.slice(i, i + 200))
    for (const r of (data ?? []) as { locality_id: string; is_active: boolean }[]) out.set(r.locality_id, !!r.is_active)
  }
  return out
}

// Localities that were closed before a change and are open after it.
async function newlyOpened(admin: SupabaseClient, ids: string[], before: Map<string, boolean>): Promise<string[]> {
  const after = await openMap(admin, ids)
  return ids.filter((id) => before.get(id) === false && after.get(id) === true)
}

// Tells the people who live in a newly opened place (hosts and cleaners) through the
// bell. Once per person per place. Best-effort: never fails the change itself.
async function notifyAreaOpened(admin: SupabaseClient, localityIds: string[]): Promise<number> {
  if (localityIds.length === 0) return 0
  try {
    const [{ data: hosts }, { data: cleaners }, { data: locs }] = await Promise.all([
      admin.from('customers').select('id, locality_id').eq('status', 'approved').in('locality_id', localityIds).limit(2000),
      admin.from('cleaners').select('id, locality_id').eq('status', 'approved').in('locality_id', localityIds).limit(2000),
      admin.from('localities').select('id, name_he, name_en, name_en_display').in('id', localityIds),
    ])
    const place = new Map((locs ?? []).map((l) => [l.id, { he: l.name_he as string, en: (l.name_en_display || l.name_en || l.name_he) as string }]))
    const inputs: NotifyInput[] = [
      ...((hosts ?? []) as { id: string; locality_id: string }[]).map((h) => ({ ...h, href: '/browse' })),
      ...((cleaners ?? []) as { id: string; locality_id: string }[]).map((c) => ({ ...c, href: '/cleaner/dashboard' })),
    ].map((p) => ({
      userId: p.id,
      kind: 'area_opened' as const,
      data: { place_he: place.get(p.locality_id)?.he ?? '', place_en: place.get(p.locality_id)?.en ?? '' },
      href: p.href,
      dedupeKey: `area_opened:${p.locality_id}`,
    }))
    for (let i = 0; i < inputs.length; i += 500) await notify(admin, inputs.slice(i, i + 500))
    return inputs.length
  } catch (e) {
    console.error('[locations] area-opened notifications failed', e)
    return 0
  }
}

async function logAction(admin: SupabaseClient, rows: { admin_id: string; target_type: string; target_id: string; action: string; payload: unknown }[]) {
  const { error } = await admin.from('admin_action_log').insert(rows)
  if (error) console.error('[locations] audit log failed', error.message)
}

// ── single / bulk locality status ──────────────────────────────────────────
// 'open' / 'closed' write the locality's OWN setting; 'inherit' removes it so the
// locality follows its region again. Opening notifies the people who live there.
export async function setLocalityStatus(input: { ids: string[]; status: string }): Promise<Result> {
  const auth = await requireAdminId()
  if ('error' in auth) return auth
  if (!isSetStatus(input.status)) return { error: 'Invalid status' }
  const ids = cleanIds(input.ids)
  if (ids.length === 0) return { error: 'Nothing selected' }
  if (ids.length > MAX_BULK) return { error: `Select at most ${MAX_BULK} locations at a time` }

  const admin = createAdminClient()
  const { data: prevRows, error: prevError } = await admin
    .from('locality_overrides')
    .select('locality_id, is_active, status, note')
    .in('locality_id', ids)
    .returns<{ locality_id: string; is_active: boolean; status: string | null; note: string | null }[]>()
  if (prevError) return { error: 'Locations are not set up yet — run the latest migrations first.' }
  const prev = new Map((prevRows ?? []).map((r) => [r.locality_id, r]))

  const before = await openMap(admin, ids)
  const batch = randomUUID()
  const now = new Date().toISOString()

  if (input.status === 'inherit') {
    const toRemove = ids.filter((id) => prev.has(id))
    if (toRemove.length) {
      const { error } = await admin.from('locality_overrides').delete().in('locality_id', toRemove)
      if (error) return { error: 'Could not update the locations. Please try again.' }
    }
  } else {
    const rows = ids.map((id) => ({
      locality_id: id,
      is_active: input.status === 'open',
      status: input.status === 'open' ? 'open' : 'not_open',
      updated_by: auth.id,
      updated_at: now,
    }))
    const { error } = await admin.from('locality_overrides').upsert(rows, { onConflict: 'locality_id' })
    if (error) return { error: 'Could not update the locations. Please try again.' }
  }

  await logAction(admin, ids.map((id) => {
    const p = prev.get(id)
    const from: Before = p
      ? { override: true, is_active: p.is_active, status: p.status, note: p.note }
      : { override: false, is_active: null, status: null, note: null }
    return { admin_id: auth.id, target_type: 'locality', target_id: id, action: 'locality_status', payload: { batch, from, to: input.status } }
  }))

  const notified = await notifyAreaOpened(admin, await newlyOpened(admin, ids, before))
  revalidatePath('/admin/locations')
  return { success: true, batch, changed: ids.length, notified }
}

// ── regions ────────────────────────────────────────────────────────────────
export async function createRegion(input: { name: string }): Promise<Result> {
  const auth = await requireAdminId()
  if ('error' in auth) return auth
  const name = (input.name ?? '').trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 60) return { error: 'Give the region a name (2–60 characters).' }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('service_regions')
    .insert({ name, is_active: false, updated_by: auth.id })
    .select('id')
    .single<{ id: string }>()
  if (error) return { error: error.code === '23505' ? 'A region with this name already exists.' : 'Could not create the region.' }
  await logAction(admin, [{ admin_id: auth.id, target_type: 'region', target_id: data.id, action: 'region_create', payload: { name } }])
  revalidatePath('/admin/locations')
  return { success: true, regionId: data.id }
}

// Puts localities in a region (one region per locality: moving replaces) or, with
// regionId = null, takes them out. A locality WITHOUT its own setting follows its
// region, so joining an open region opens it — those people are notified.
export async function assignToRegion(input: { ids: string[]; regionId: string | null }): Promise<Result> {
  const auth = await requireAdminId()
  if ('error' in auth) return auth
  const ids = cleanIds(input.ids)
  if (ids.length === 0) return { error: 'Nothing selected' }
  if (ids.length > MAX_BULK) return { error: `Select at most ${MAX_BULK} locations at a time` }
  if (input.regionId !== null && !UUID.test(input.regionId)) return { error: 'Invalid region' }

  const admin = createAdminClient()
  if (input.regionId) {
    const { data: region } = await admin.from('service_regions').select('id').eq('id', input.regionId).maybeSingle()
    if (!region) return { error: 'Region not found' }
  }
  const { data: prevRows } = await admin.from('service_region_members').select('locality_id, region_id').in('locality_id', ids)
  const before = await openMap(admin, ids)

  if (input.regionId) {
    const { error } = await admin.from('service_region_members')
      .upsert(ids.map((id) => ({ locality_id: id, region_id: input.regionId })), { onConflict: 'locality_id' })
    if (error) return { error: 'Could not update the region.' }
  } else {
    const { error } = await admin.from('service_region_members').delete().in('locality_id', ids)
    if (error) return { error: 'Could not update the region.' }
  }

  await logAction(admin, [{
    admin_id: auth.id, target_type: 'region', target_id: input.regionId ?? ids[0], action: 'region_assign',
    payload: { ids, region_id: input.regionId, previous: prevRows ?? [] },
  }])
  const notified = await notifyAreaOpened(admin, await newlyOpened(admin, ids, before))
  revalidatePath('/admin/locations')
  return { success: true, changed: ids.length, notified }
}

// Opens or closes a whole region. Localities with their own setting keep it.
export async function setRegionActive(input: { regionId: string; active: boolean }): Promise<Result> {
  const auth = await requireAdminId()
  if ('error' in auth) return auth
  if (!UUID.test(input.regionId ?? '')) return { error: 'Invalid region' }
  const admin = createAdminClient()
  const { data: region } = await admin.from('service_regions').select('id, is_active').eq('id', input.regionId).maybeSingle<{ id: string; is_active: boolean }>()
  if (!region) return { error: 'Region not found' }

  const { data: members } = await admin.from('service_region_members').select('locality_id').eq('region_id', region.id).limit(5000)
  const memberIds = (members ?? []).map((m: { locality_id: string }) => m.locality_id)
  const before = await openMap(admin, memberIds)

  const batch = randomUUID()
  const { error } = await admin.from('service_regions')
    .update({ is_active: input.active, updated_by: auth.id, updated_at: new Date().toISOString() })
    .eq('id', region.id)
  if (error) return { error: 'Could not update the region.' }

  await logAction(admin, [{
    admin_id: auth.id, target_type: 'region', target_id: region.id, action: 'region_status',
    payload: { batch, from: { is_active: region.is_active }, to: input.active ? 'open' : 'closed' },
  }])
  const notified = await notifyAreaOpened(admin, await newlyOpened(admin, memberIds, before))
  revalidatePath('/admin/locations')
  return { success: true, batch, changed: memberIds.length, notified }
}

// ── undo ───────────────────────────────────────────────────────────────────
// Restores everything changed in one batch (locality settings or a region toggle).
// People who were already notified that an area opened can't be un-notified.
export async function undoLocationChange(batch: string): Promise<Result> {
  const auth = await requireAdminId()
  if ('error' in auth) return auth
  if (!UUID.test(batch ?? '')) return { error: 'Invalid change' }

  const admin = createAdminClient()
  const { data: rows } = await admin
    .from('admin_action_log')
    .select('id, action, target_id, payload')
    .in('action', ['locality_status', 'region_status'])
    .eq('payload->>batch', batch)
    .returns<{ id: string; action: string; target_id: string; payload: { from: Before & { is_active: boolean | null }; undone_at?: string } }[]>()
  const todo = (rows ?? []).filter((r) => !r.payload?.undone_at)
  if (todo.length === 0) return { error: 'This change was already undone.' }

  const now = new Date().toISOString()
  const localityRows = todo.filter((r) => r.action === 'locality_status')
  const regionRows = todo.filter((r) => r.action === 'region_status')

  const toDelete = localityRows.filter((r) => !r.payload.from.override).map((r) => r.target_id)
  const toRestore = localityRows.filter((r) => r.payload.from.override).map((r) => ({
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
  for (const r of regionRows) {
    const { error } = await admin.from('service_regions').update({ is_active: !!r.payload.from.is_active, updated_by: auth.id, updated_at: now }).eq('id', r.target_id)
    if (error) return { error: 'Could not undo the change.' }
  }

  // Mark each entry undone (update by id) and record the undo.
  for (const r of todo) await admin.from('admin_action_log').update({ payload: { ...r.payload, undone_at: now } }).eq('id', r.id)
  await logAction(admin, todo.map((r) => ({
    admin_id: auth.id, target_type: r.action === 'region_status' ? 'region' : 'locality', target_id: r.target_id,
    action: `${r.action}_undo`, payload: { batch, original_log_id: r.id },
  })))

  revalidatePath('/admin/locations')
  return { success: true, changed: todo.length }
}
