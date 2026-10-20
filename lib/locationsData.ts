import { createAdminClient } from '@/lib/supabase/admin'
import { loadLocalityDirectory } from '@/lib/localities/directory'
import { rankLocalities } from '@/lib/localities/search'
import type { LocationFilters, SetStatus } from '@/lib/locations'

export type LocationRow = {
  locality_id: string
  cbs_code: number
  name_he: string
  name_en: string | null
  name_en_display: string | null
  district: string | null
  region_id: string | null
  region_name: string | null
  is_open: boolean
  status_source: 'override' | 'region' | 'default'
  customers: number
  cleaners: number
  waiting: number
}

export type Summary = {
  total_localities: number
  open_localities: number
  customers: number
  cleaners: number
  waiting_customers: number
  waiting_cleaners: number
  no_area_customers: number
  no_area_cleaners: number
}

export type RegionRow = {
  region_id: string
  name: string
  description: string | null
  is_active: boolean
  localities: number
  open_localities: number
  own_setting: number
  customers: number
  cleaners: number
  waiting_customers: number
  waiting_cleaners: number
}

const num = (v: unknown) => Number(v ?? 0)
const FALLBACK_DISTRICTS = ['הצפון', 'חיפה', 'המרכז', 'תל אביב', 'ירושלים', 'הדרום', 'אזור יהודה ושומרון']

// Every read goes through the aggregated SQL functions of migration 0041, so the page
// never loads individual people. `setupNeeded` = the migration hasn't been applied.
export async function loadLocationsPage(f: LocationFilters, pageSize: number): Promise<{
  setupNeeded: boolean
  summary: Summary | null
  rows: LocationRow[]
  total: number
  regions: { id: string; name: string; is_active: boolean }[]
  districts: string[]
}> {
  const admin = createAdminClient()

  // Text search uses the same ranker as the signup picker (Hebrew, English, aliases,
  // vowel variants); the SQL function then filters/sorts by the ranked ids.
  let ids: string[] | null = null
  if (f.q) {
    const directory = await loadLocalityDirectory()
    ids = /^\d{1,6}$/.test(f.q)
      ? directory.filter((d) => d.cbs_code === parseInt(f.q, 10)).map((d) => d.id)
      : rankLocalities(directory, f.q, 300).map((r) => r.id)
  }

  const [summary, list, regions, districts] = await Promise.all([
    admin.rpc('admin_locations_summary'),
    admin.rpc('admin_locations_list', {
      p_ids: ids,
      p_district: f.district,
      p_region: f.region || null,
      p_status: f.status,
      p_users: f.users,
      p_sort: f.sort,
      p_dir: f.dir,
      p_limit: pageSize,
      p_offset: (f.page - 1) * pageSize,
    }),
    admin.from('service_regions').select('id, name, is_active').order('name'),
    admin.rpc('admin_location_districts'),
  ])

  if (summary.error || list.error) {
    return { setupNeeded: true, summary: null, rows: [], total: 0, regions: [], districts: [] }
  }

  const s = ((summary.data ?? []) as Record<string, unknown>[])[0] ?? {}
  const rows = ((list.data ?? []) as Record<string, unknown>[]).map((r) => ({
    locality_id: String(r.locality_id),
    cbs_code: num(r.cbs_code),
    name_he: String(r.name_he ?? ''),
    name_en: (r.name_en as string | null) ?? null,
    name_en_display: (r.name_en_display as string | null) ?? null,
    district: (r.district as string | null) ?? null,
    region_id: (r.region_id as string | null) ?? null,
    region_name: (r.region_name as string | null) ?? null,
    is_open: !!r.is_open,
    status_source: r.status_source as LocationRow['status_source'],
    customers: num(r.customers),
    cleaners: num(r.cleaners),
    waiting: num(r.waiting),
  }))
  const total = ((list.data ?? []) as Record<string, unknown>[])[0]?.total_count

  return {
    setupNeeded: false,
    summary: {
      total_localities: num(s.total_localities),
      open_localities: num(s.open_localities),
      customers: num(s.customers),
      cleaners: num(s.cleaners),
      waiting_customers: num(s.waiting_customers),
      waiting_cleaners: num(s.waiting_cleaners),
      no_area_customers: num(s.no_area_customers),
      no_area_cleaners: num(s.no_area_cleaners),
    },
    rows,
    total: num(total),
    regions: (regions.data ?? []) as { id: string; name: string; is_active: boolean }[],
    districts: districts.error ? FALLBACK_DISTRICTS : ((districts.data ?? []) as { district: string }[]).map((d) => d.district),
  }
}

export async function loadRegionsOverview(): Promise<{ setupNeeded: boolean; regions: RegionRow[] }> {
  const { data, error } = await createAdminClient().rpc('admin_locations_regions')
  if (error) return { setupNeeded: true, regions: [] }
  return {
    setupNeeded: false,
    regions: ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      region_id: String(r.region_id),
      name: String(r.name),
      description: (r.description as string | null) ?? null,
      is_active: !!r.is_active,
      localities: num(r.localities),
      open_localities: num(r.open_localities),
      own_setting: num(r.own_setting),
      customers: num(r.customers),
      cleaners: num(r.cleaners),
      waiting_customers: num(r.waiting_customers),
      waiting_cleaners: num(r.waiting_cleaners),
    })),
  }
}

export type RecentChange = {
  batch: string
  at: string
  adminName: string | null
  kind: 'locality' | 'region'
  status: SetStatus
  count: number
  names: string[]
  undone: boolean
}

type LogRow = {
  admin_id: string | null
  target_id: string
  action: 'locality_status' | 'region_status'
  payload: { batch?: string; to?: string; undone_at?: string } | null
  created_at: string
}

// Old (0040) entries recorded 'not_open' / 'coming_soon'; both mean closed now.
const toStatus = (v: string | undefined): SetStatus => (v === 'open' ? 'open' : v === 'inherit' ? 'inherit' : 'closed')

// The last few changes (grouped by batch) for the "Recent changes" panel.
export async function loadRecentChanges(limitBatches = 6): Promise<RecentChange[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('admin_action_log')
    .select('admin_id, target_id, action, payload, created_at')
    .in('action', ['locality_status', 'region_status'])
    .order('created_at', { ascending: false })
    .limit(400)
    .returns<LogRow[]>()
  if (!data?.length) return []

  const grouped = new Map<string, { at: string; admin: string | null; kind: 'locality' | 'region'; status: SetStatus; ids: string[]; undone: boolean }>()
  for (const r of data) {
    const b = r.payload?.batch
    if (!b) continue
    const g = grouped.get(b) ?? {
      at: r.created_at, admin: r.admin_id, kind: r.action === 'region_status' ? 'region' as const : 'locality' as const,
      status: toStatus(r.payload?.to), ids: [], undone: !!r.payload?.undone_at,
    }
    g.ids.push(r.target_id)
    grouped.set(b, g)
  }
  const batches = Array.from(grouped.entries()).slice(0, limitBatches)
  const localityIds = Array.from(new Set(batches.filter(([, g]) => g.kind === 'locality').flatMap(([, g]) => g.ids.slice(0, 3))))
  const regionIds = Array.from(new Set(batches.filter(([, g]) => g.kind === 'region').flatMap(([, g]) => g.ids)))
  const adminIds = Array.from(new Set(batches.map(([, g]) => g.admin).filter((x): x is string => !!x)))
  const [{ data: locs }, { data: regs }, { data: admins }] = await Promise.all([
    localityIds.length ? admin.from('localities').select('id, name_he, name_en, name_en_display').in('id', localityIds) : Promise.resolve({ data: [] as { id: string; name_he: string; name_en: string | null; name_en_display: string | null }[] }),
    regionIds.length ? admin.from('service_regions').select('id, name').in('id', regionIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    adminIds.length ? admin.from('profiles').select('id, full_name').in('id', adminIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ])
  const locName = new Map((locs ?? []).map((l) => [l.id, l.name_en_display || l.name_en || l.name_he]))
  const regName = new Map((regs ?? []).map((r) => [r.id, r.name]))
  const adminName = new Map((admins ?? []).map((a) => [a.id, a.full_name]))

  return batches.map(([batch, g]) => ({
    batch,
    at: g.at,
    adminName: g.admin ? adminName.get(g.admin) ?? null : null,
    kind: g.kind,
    status: g.status,
    count: g.ids.length,
    names: g.ids.slice(0, 3).map((id) => (g.kind === 'region' ? regName.get(id) : locName.get(id)) ?? '—'),
    undone: g.undone,
  }))
}
