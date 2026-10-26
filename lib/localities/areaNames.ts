import type { SupabaseClient } from '@supabase/supabase-js'

// A town's name in both languages — the only place information ever put in a
// calendar event. Never an address.
export type AreaName = { he: string; en: string }

// The general area (the chosen town) for each of these hosts, read with the
// service-role client. Best-effort: any failure (e.g. migration 0039 not applied)
// returns an empty map, and the calendar event simply has no location.
export async function fetchCustomerAreas(admin: SupabaseClient, customerIds: string[]): Promise<Map<string, AreaName>> {
  const out = new Map<string, AreaName>()
  const ids = Array.from(new Set(customerIds.filter(Boolean)))
  if (ids.length === 0) return out
  try {
    const { data: people, error } = await admin.from('customers').select('id, locality_id').in('id', ids)
    if (error) return out
    const localityIds = Array.from(new Set((people ?? []).map((p: { locality_id: string | null }) => p.locality_id).filter((x): x is string => !!x)))
    if (localityIds.length === 0) return out

    let rows: { id: string; name_he: string; name_en: string | null; name_en_display?: string | null }[] | null = null
    const withDisplay = await admin.from('localities').select('id, name_he, name_en, name_en_display').in('id', localityIds)
    if (!withDisplay.error) rows = withDisplay.data
    else {
      const plain = await admin.from('localities').select('id, name_he, name_en').in('id', localityIds)
      rows = plain.data
    }
    const byLocality = new Map((rows ?? []).map((l) => [l.id, { he: l.name_he, en: (l.name_en_display || l.name_en || l.name_he) as string }]))
    for (const p of (people ?? []) as { id: string; locality_id: string | null }[]) {
      const a = p.locality_id ? byLocality.get(p.locality_id) : undefined
      if (a) out.set(p.id, a)
    }
  } catch {
    /* no area → no location on the event */
  }
  return out
}
