import type { SupabaseClient } from '@supabase/supabase-js'
import { EXPERIENCE_VALUES } from '@/lib/onboarding/options'

// Cleaners' "how long have you been cleaning" ranges (migration 0043) as id -> range. FAILS
// OPEN like the other late-added columns: any error (migration not applied) returns an empty
// map, and the screens fall back to the number of years.
export async function fetchExperienceRanges(admin: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const list = Array.from(new Set(ids.filter(Boolean)))
  if (list.length === 0) return out
  try {
    const { data, error } = await admin.from('cleaners').select('id, experience_range').in('id', list).not('experience_range', 'is', null)
    if (error) return out
    for (const r of (data ?? []) as { id: string; experience_range: string | null }[]) {
      if (r.experience_range && EXPERIENCE_VALUES.includes(r.experience_range)) out.set(r.id, r.experience_range)
    }
  } catch {
    /* fall back to years */
  }
  return out
}
