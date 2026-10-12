import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeQuery } from '@/lib/localities/normalize'
import { rankLocalities, type LocalityOption } from '@/lib/localities/search'

// Locality autocomplete. Public (it is also used on the registration screens,
// before an account exists) and read-only: only geography — names, type, council,
// position — never availability or anything about users. The query is reduced to
// the same normalised key the names are stored with, so Hebrew, English and
// alternative spellings all land on the same record; results are ranked here and
// capped at 8, so the list is never sent to the device.
//
// The whole list is ~1,300 small rows, so the server keeps it in memory for a few
// minutes and ranks there (this also lets vowel-insensitive English spellings
// match, which a SQL LIKE couldn't).
export const dynamic = 'force-dynamic'

type Candidate = LocalityOption & { search_he: string; search_en: string; alias_keys?: string[] }

const COLUMNS = 'id, cbs_code, name_he, name_en, locality_type, regional_council, lat, lng, population, search_he, search_en'
const TTL_MS = 5 * 60 * 1000
let cache: { at: number; rows: Candidate[] } | null = null

async function loadCandidates(): Promise<Candidate[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows
  const admin = createAdminClient()
  // PostgREST caps one response at 1,000 rows, so read the list in pages.
  const rows: Candidate[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from('localities')
      .select(COLUMNS)
      .order('cbs_code')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...((data ?? []) as Candidate[]))
    if (!data || data.length < 1000) break
  }
  const { data: aliasRows } = await admin.from('locality_aliases').select('locality_id, alias_search').limit(1000)
  const aliases = new Map<string, string[]>()
  for (const a of aliasRows ?? []) aliases.set(a.locality_id, [...(aliases.get(a.locality_id) ?? []), a.alias_search])
  const list = rows.map((r) => ({ ...r, alias_keys: aliases.get(r.id) }))
  cache = { at: Date.now(), rows: list }
  return list
}

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 40)
  if (!q || !normalizeQuery(q).key) return NextResponse.json({ results: [] })
  try {
    return NextResponse.json({ results: rankLocalities(await loadCandidates(), q, 8) })
  } catch (e) {
    console.error('locality search failed', e)
    return NextResponse.json({ results: [], error: 'unavailable' })
  }
}
