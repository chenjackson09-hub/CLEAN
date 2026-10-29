import type { SupabaseClient } from '@supabase/supabase-js'
import { geocodeAddress } from '@/lib/geocode'
import { chooseCoordinates, composeAddress, type Coordinates, type PickedLocality } from './address'

const COLUMNS = 'id, name_he, name_en, locality_type, regional_council, lat, lng'

export async function getLocality(admin: SupabaseClient, id: string | null | undefined): Promise<PickedLocality | null> {
  if (!id) return null
  try {
    const { data } = await admin.from('localities').select(COLUMNS).eq('id', id).maybeSingle<PickedLocality>()
    return data ?? null
  } catch {
    return null
  }
}

// Turns what the person entered — a picked locality and an optional street — into
// what is stored: the address text, the coordinates and the (verified) locality id.
//   • locality picked, no street  → the locality's official coordinates (no geocoder)
//   • locality picked + street    → a street-level geocode, but only if it lands near
//                                    the locality; otherwise the locality's coordinates
//   • no locality (old behaviour) → geocode the free text, exactly as before
// The locality id is looked up on the server, so a made-up id from the client is
// ignored rather than trusted.
export async function resolvePlace(
  admin: SupabaseClient,
  // `geocode: false` skips the (slow, network) street lookup: used for the mid-wizard saves,
  // where the typed text is kept and only the final submit pays for finding coordinates.
  input: { localityId?: string | null; street: string; geocode?: boolean },
): Promise<{ address: string; coords: Coordinates | null; localityId: string | null; locationFound: boolean }> {
  const street = input.street?.trim() ?? ''
  const locality = await getLocality(admin, input.localityId)

  if (!locality) {
    const coords = street && input.geocode !== false ? await geocodeAddress(street) : null
    return { address: street, coords, localityId: null, locationFound: !!coords }
  }

  const address = composeAddress(street, locality)
  const hasStreet = street.length > 0 && address !== locality.name_he
  const streetGeocode = hasStreet && input.geocode !== false ? await geocodeAddress(address) : null
  const { coords } = chooseCoordinates(locality, streetGeocode)
  return { address, coords, localityId: locality.id, locationFound: !!coords }
}
