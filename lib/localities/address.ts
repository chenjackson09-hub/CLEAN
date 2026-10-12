import { normalizeEn, normalizeHe } from './normalize'
import { distanceKm } from '@/lib/geo'

export type PickedLocality = {
  id: string
  name_he: string
  name_en: string | null
  locality_type: string
  regional_council: string | null
  lat: number | null
  lng: number | null
}

// The address string stored on a profile: the street the person typed (if any)
// plus the official locality name. If the street text already says the locality
// ("12 Herzl, Beit Hillel") it is kept as is, so nothing is duplicated and an
// existing address is never mangled.
export function composeAddress(street: string, locality: Pick<PickedLocality, 'name_he' | 'name_en'> | null): string {
  const s = street.trim()
  if (!locality) return s
  if (!s) return locality.name_he
  const sHe = normalizeHe(s)
  const sEn = normalizeEn(s)
  const mentions =
    sHe.includes(normalizeHe(locality.name_he)) ||
    (!!locality.name_en && sEn.includes(normalizeEn(locality.name_en)))
  return mentions ? s : `${s}, ${locality.name_he}`
}

// A street-level geocode is only trusted when it lands near the chosen locality.
// A common street name ("Herzl") can match the same street in another city; in
// that case the locality's own official coordinates are used instead, so the saved
// position can never silently jump to the wrong town.
export const STREET_GEOCODE_MAX_KM = 8

export type Coordinates = { lat: number; lng: number }

export function chooseCoordinates(
  locality: { lat: number | null; lng: number | null } | null,
  streetGeocode: Coordinates | null,
): { coords: Coordinates | null; source: 'street' | 'locality' | 'geocode' | 'none' } {
  const base = locality && locality.lat != null && locality.lng != null ? { lat: locality.lat, lng: locality.lng } : null
  if (!base) return streetGeocode ? { coords: streetGeocode, source: 'geocode' } : { coords: null, source: 'none' }
  if (streetGeocode && distanceKm(base, streetGeocode) <= STREET_GEOCODE_MAX_KM) {
    return { coords: streetGeocode, source: 'street' }
  }
  return { coords: base, source: 'locality' }
}
