import { createAdminClient } from '@/lib/supabase/admin'
import { aliasKey, type LocalityOption } from './search'
import { normalizeEn } from './normalize'

export type DirectoryEntry = LocalityOption & { search_he: string; search_en: string; alias_keys?: string[] }

const BASE_COLUMNS = 'id, cbs_code, name_he, name_en, locality_type, regional_council, lat, lng, population, search_he, search_en'
const TTL_MS = 5 * 60 * 1000
let cache: { at: number; rows: DirectoryEntry[] } | null = null

export function clearLocalityDirectoryCache() {
  cache = null
}

// The whole locality list (~1,300 small rows) kept in memory for a few minutes, so
// the signup picker and the admin Locations search rank names with the SAME engine
// (`rankLocalities`) — Hebrew, English, alternative spellings and vowel variants.
//
//   • name_en shown to people = the display spelling ("Beit Hillel") when one is set,
//     else the official CBS spelling; the official spelling stays searchable.
//   • aliases (admin-entered extra spellings) and the display spelling are matched too.
export async function loadLocalityDirectory(): Promise<DirectoryEntry[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows
  const admin = createAdminClient()

  // PostgREST caps one response at 1,000 rows, so read the list in pages. The display
  // column comes from migration 0041; without it the official names are used.
  type Row = DirectoryEntry & { name_en_display?: string | null }
  const readAll = async (columns: string): Promise<Row[]> => {
    const rows: Row[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from('localities').select(columns).order('cbs_code').range(from, from + 999)
      if (error) throw error
      rows.push(...((data ?? []) as unknown as Row[]))
      if (!data || data.length < 1000) break
    }
    return rows
  }
  let rows: Row[]
  try {
    rows = await readAll(`${BASE_COLUMNS}, name_en_display`)
  } catch {
    rows = await readAll(BASE_COLUMNS)
  }

  const { data: aliasRows } = await admin.from('locality_aliases').select('locality_id, alias_search').limit(5000)
  const aliases = new Map<string, string[]>()
  for (const a of aliasRows ?? []) aliases.set(a.locality_id, [...(aliases.get(a.locality_id) ?? []), a.alias_search])

  const list: DirectoryEntry[] = rows.map(({ name_en_display, ...r }) => {
    const display = name_en_display?.trim() || null
    return {
      ...r,
      name_en: display ?? r.name_en,
      alias_keys: [...(aliases.get(r.id) ?? []), ...(display ? [normalizeEn(display)] : [])],
    }
  })
  cache = { at: Date.now(), rows: list }
  return list
}

export { aliasKey }
