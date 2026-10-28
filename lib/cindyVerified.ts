import type { SupabaseClient } from '@supabase/supabase-js'

export type VerifiableTable = 'cleaners' | 'customers'

// Who is "Cindy Verified" — set only by an admin (see setCindyVerified). Returns id →
// the moment they were verified. FAILS OPEN: any error (e.g. migration 0042 not applied)
// returns an empty map, so every page just shows no badge instead of breaking.
// With `ids` it asks only about those people (small lists); without, it reads everyone
// who is verified (the set is small and an admin screen needs all of them).
export async function fetchCindyVerified(admin: SupabaseClient, table: VerifiableTable, ids?: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  try {
    const list = ids ? Array.from(new Set(ids.filter(Boolean))) : null
    if (list && list.length === 0) return out
    let q = admin.from(table).select('id, cindy_verified_at').not('cindy_verified_at', 'is', null)
    if (list && list.length <= 100) q = q.in('id', list)
    const { data, error } = await q.limit(2000)
    if (error) return out
    for (const r of (data ?? []) as { id: string; cindy_verified_at: string | null }[]) {
      if (r.cindy_verified_at) out.set(r.id, r.cindy_verified_at)
    }
  } catch {
    /* no badge */
  }
  return out
}
