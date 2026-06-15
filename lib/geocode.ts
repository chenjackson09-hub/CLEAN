export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    address
  )}`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Clean-App' },
  })
  if (!res.ok) return null

  const results = await res.json()
  if (!Array.isArray(results) || results.length === 0) return null

  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) }
}
