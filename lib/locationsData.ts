import { createAdminClient } from '@/lib/supabase/admin'
import type { LocationStatus, Period } from '@/lib/locations'

export type LocationRow = {
  locality_id: string
  cbs_code: number
  name_he: string
  name_en: string | null
  district: string | null
  status: LocationStatus
  status_source: 'override' | 'region' | 'default'
  hosts: number
  active_hosts: number
  cleaners: number
  requests: number
  waiting: number
  new_users: number
  prev_new_users: number
  total_count: number
}

export type LocationTotals = {
  total_localities: number
  open_localities: number
  hosts: number
  active_hosts: number
  cleaners: number
  active_cleaners: number
  requests: number
  waiting: number
}

export type OverviewQuery = {
  period: Period
  he: string
  en: string
  code: string
  district: string
  status: string
  onlyWithUsers: boolean
  sort: string
  dir: 'asc' | 'desc'
  page: number
  pageSize: number
}

const num = (v: unknown) => Number(v ?? 0)

// All reads go through the aggregated SQL functions in migration 0040, so the
// page never loads individual user rows. Returns `setupNeeded` when those
// functions don't exist yet (migration not applied) instead of throwing.
export async function loadLocationsOverview(q: OverviewQuery): Promise<{
  setupNeeded: boolean
  rows: LocationRow[]
  total: number
  totals: LocationTotals | null
  districts: string[]
  fastest: { name_he: string; name_en: string | null; new_users: number } | null
}> {
  const admin = createAdminClient()
  const range = { p_since: q.period.since.toISOString(), p_until: q.period.until.toISOString() }

  const [overview, totals, districts, fastestRes] = await Promise.all([
    admin.rpc('admin_location_overview', {
      ...range,
      p_he: q.he,
      p_en: q.en,
      p_code: q.code,
      p_district: q.district,
      p_status: q.status,
      p_only_with_users: q.onlyWithUsers,
      p_sort: q.sort,
      p_dir: q.dir,
      p_limit: q.pageSize,
      p_offset: (q.page - 1) * q.pageSize,
    }),
    admin.rpc('admin_location_totals', range),
    admin.rpc('admin_location_districts'),
    // Most new sign-ups in the period, independent of the table's own filters.
    admin.rpc('admin_location_overview', { ...range, p_sort: 'growth', p_dir: 'desc', p_limit: 1, p_offset: 0 }),
  ])

  if (overview.error || totals.error) {
    return { setupNeeded: true, rows: [], total: 0, totals: null, districts: [], fastest: null }
  }

  const rows = ((overview.data ?? []) as Record<string, unknown>[]).map(r => ({
    locality_id: String(r.locality_id),
    cbs_code: num(r.cbs_code),
    name_he: String(r.name_he ?? ''),
    name_en: (r.name_en as string | null) ?? null,
    district: (r.district as string | null) ?? null,
    status: r.status as LocationStatus,
    status_source: r.status_source as LocationRow['status_source'],
    hosts: num(r.hosts),
    active_hosts: num(r.active_hosts),
    cleaners: num(r.cleaners),
    requests: num(r.requests),
    waiting: num(r.waiting),
    new_users: num(r.new_users),
    prev_new_users: num(r.prev_new_users),
    total_count: num(r.total_count),
  }))

  const t = ((totals.data ?? []) as Record<string, unknown>[])[0] ?? {}
  const f = ((fastestRes.data ?? []) as Record<string, unknown>[])[0]
  const fastest = f && num(f.new_users) > 0
    ? { name_he: String(f.name_he ?? ''), name_en: (f.name_en as string | null) ?? null, new_users: num(f.new_users) }
    : null
  return {
    fastest,
    setupNeeded: false,
    rows,
    total: rows[0]?.total_count ?? 0,
    totals: {
      total_localities: num(t.total_localities),
      open_localities: num(t.open_localities),
      hosts: num(t.hosts),
      active_hosts: num(t.active_hosts),
      cleaners: num(t.cleaners),
      active_cleaners: num(t.active_cleaners),
      requests: num(t.requests),
      waiting: num(t.waiting),
    },
    districts: ((districts.data ?? []) as { district: string }[]).map(d => d.district),
  }
}

export type RecentChange = {
  batch: string
  at: string
  adminName: string | null
  status: LocationStatus
  count: number
  names: string[]
  undone: boolean
}

// The last few status changes (grouped by batch) for the "Recent changes" panel.
export async function loadRecentChanges(limitBatches = 6): Promise<RecentChange[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('admin_action_log')
    .select('admin_id, target_id, payload, created_at')
    .eq('action', 'locality_status')
    .order('created_at', { ascending: false })
    .limit(400)
    .returns<{ admin_id: string | null; target_id: string; payload: { batch: string; to: LocationStatus; undone_at?: string } | null; created_at: string }[]>()
  if (!data?.length) return []

  const grouped = new Map<string, { at: string; admin: string | null; status: LocationStatus; ids: string[]; undone: boolean }>()
  for (const r of data) {
    const b = r.payload?.batch
    if (!b) continue
    const g = grouped.get(b) ?? { at: r.created_at, admin: r.admin_id, status: r.payload!.to, ids: [], undone: !!r.payload!.undone_at }
    g.ids.push(r.target_id)
    grouped.set(b, g)
  }
  const batches = Array.from(grouped.entries()).slice(0, limitBatches)
  const allIds = Array.from(new Set(batches.flatMap(([, g]) => g.ids.slice(0, 3))))
  const adminIds = Array.from(new Set(batches.map(([, g]) => g.admin).filter((x): x is string => !!x)))
  const [{ data: locs }, { data: admins }] = await Promise.all([
    allIds.length ? admin.from('localities').select('id, name_he, name_en').in('id', allIds) : Promise.resolve({ data: [] as { id: string; name_he: string; name_en: string | null }[] }),
    adminIds.length ? admin.from('profiles').select('id, full_name').in('id', adminIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ])
  const locName = new Map((locs ?? []).map(l => [l.id, l.name_en || l.name_he]))
  const adminName = new Map((admins ?? []).map(a => [a.id, a.full_name]))

  return batches.map(([batch, g]) => ({
    batch,
    at: g.at,
    adminName: g.admin ? adminName.get(g.admin) ?? null : null,
    status: g.status,
    count: g.ids.length,
    names: g.ids.slice(0, 3).map(id => locName.get(id) ?? '—'),
    undone: g.undone,
  }))
}
