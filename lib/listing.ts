import type { SupabaseClient } from '@supabase/supabase-js'
import { REQUIRE_LISTING_CHECKLIST } from '@/lib/features'

// Of these approved cleaners, keep the ones that have a photo and a rate (the availability
// part is already how the schedule finds them: no available day, no day to show). Fails open:
// if the photos cannot be read, nobody is hidden.
export async function onlyListed<T extends { id: string; hourly_rate?: number | null }>(admin: SupabaseClient, cleaners: T[]): Promise<T[]> {
  if (!REQUIRE_LISTING_CHECKLIST || cleaners.length === 0) return cleaners
  const withRate = cleaners.filter((c) => typeof c.hourly_rate === 'number' && c.hourly_rate > 0)
  if (withRate.length === 0) return []
  try {
    const { data, error } = await admin.from('profiles').select('id, avatar_url').in('id', withRate.map((c) => c.id))
    if (error || !data) return cleaners
    const withPhoto = new Set((data as { id: string; avatar_url: string | null }[]).filter((p) => !!p.avatar_url).map((p) => p.id))
    return withRate.filter((c) => withPhoto.has(c.id))
  } catch {
    return cleaners
  }
}
