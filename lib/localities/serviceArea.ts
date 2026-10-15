import type { SupabaseClient } from '@supabase/supabase-js'

export type ServiceAreaStatus =
  | { state: 'open' }
  | { state: 'closed'; nameHe: string | null; nameEn: string | null }

// Whether the app operates where this host is. Decided from the host's chosen
// locality (never GPS) through `locality_effective_availability`, the one place
// availability is defined: the locality's own override → its region → inactive.
//
// Fails OPEN. It only says "closed" when we positively know the host picked a
// locality and that locality is inactive; no locality chosen yet, a query error,
// or a migration that hasn't run all read as "open", so an infrastructure
// hiccup can never lock out a host who was working before.
export async function hostServiceArea(admin: SupabaseClient, userId: string): Promise<ServiceAreaStatus> {
  try {
    const { data: customer, error } = await admin
      .from('customers')
      .select('locality_id')
      .eq('id', userId)
      .maybeSingle<{ locality_id: string | null }>()
    if (error || !customer?.locality_id) return { state: 'open' }

    const { data: avail, error: availError } = await admin
      .from('locality_effective_availability')
      .select('is_active')
      .eq('locality_id', customer.locality_id)
      .maybeSingle<{ is_active: boolean | null }>()
    if (availError || avail?.is_active !== false) return { state: 'open' }

    const { data: locality } = await admin
      .from('localities')
      .select('name_he, name_en')
      .eq('id', customer.locality_id)
      .maybeSingle<{ name_he: string | null; name_en: string | null }>()
    return { state: 'closed', nameHe: locality?.name_he ?? null, nameEn: locality?.name_en ?? null }
  } catch {
    return { state: 'open' }
  }
}
