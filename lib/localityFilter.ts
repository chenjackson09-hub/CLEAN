import type { SupabaseClient } from '@supabase/supabase-js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
type SP = Record<string, string | string[] | undefined> | undefined
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''

export type LocalityFilter = {
  id: string
  locality: { name_he: string; name_en: string | null; name_en_display: string | null }
  // Where "Clear" goes (the same page, no filter) and where "Back" goes.
  clearHref: string
  backHref: string | null
}

// Reads ?locality=<id>&back=<path> on the admin Customers/Cleaners pages. `back` is
// accepted only when it is a Locations path on this site (never an off-site link).
export async function readLocalityFilter(admin: SupabaseClient, sp: SP, pagePath: string): Promise<LocalityFilter | null> {
  const id = one(sp?.locality)
  if (!UUID.test(id)) return null
  const { data } = await admin
    .from('localities')
    .select('name_he, name_en, name_en_display')
    .eq('id', id)
    .maybeSingle<LocalityFilter['locality']>()
  if (!data) return null
  const back = one(sp?.back)
  return {
    id,
    locality: data,
    clearHref: pagePath,
    backHref: /^\/admin\/locations(\?[^#]*)?$/.test(back) ? back : null,
  }
}
