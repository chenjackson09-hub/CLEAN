// Geocoding via OpenStreetMap Nominatim. Used both when a cleaner saves their
// base address and when a customer searches by location, so both sides resolve
// to consistent coordinates.
//
// Nominatim is global, so a bare query like "Allenby" or "Florentin" can match
// a same-named place on the other side of the world (Canberra, France, ...).
// We bias results to a country + language so local addresses resolve locally.
// Defaults target Israel (this is a ₪/Hebrew marketplace); override with the
// GEOCODE_COUNTRY_CODES / GEOCODE_LANGUAGE env vars if needed.

const COUNTRY_CODES = process.env.GEOCODE_COUNTRY_CODES ?? 'il'
const LANGUAGE = process.env.GEOCODE_LANGUAGE ?? 'he'

export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const q = address?.trim()
  if (!q) return null

  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
    q,
  })
  if (COUNTRY_CODES) params.set('countrycodes', COUNTRY_CODES)
  if (LANGUAGE) params.set('accept-language', LANGUAGE)

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { 'User-Agent': 'Clean-App' } }
    )
    if (!res.ok) return null

    const results = await res.json()
    if (!Array.isArray(results) || results.length === 0) return null

    const lat = parseFloat(results[0].lat)
    const lng = parseFloat(results[0].lon)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  } catch {
    return null
  }
}
