// Helpers for working with the PostGIS `location` column on cleaners.
//
// supabase-js returns a geography(Point) value as a hex-encoded EWKB string
// (e.g. "0101000020E6100000..."). We also tolerate GeoJSON objects and WKT
// ("POINT(lng lat)") so callers don't have to care how the value was selected.

export type LatLng = { lat: number; lng: number }

export function parsePoint(value: unknown): LatLng | null {
  if (value == null) return null

  // GeoJSON: { type: 'Point', coordinates: [lng, lat] }
  if (typeof value === "object") {
    const coords = (value as { coordinates?: unknown }).coordinates
    if (Array.isArray(coords) && coords.length >= 2) {
      const lng = Number(coords[0])
      const lat = Number(coords[1])
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
    }
    return null
  }

  if (typeof value !== "string") return null
  const s = value.trim()

  // WKT: POINT(lng lat)
  const wkt = s.match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i)
  if (wkt) {
    const lng = parseFloat(wkt[1])
    const lat = parseFloat(wkt[2])
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  }

  // EWKB hex
  if (/^[0-9a-fA-F]+$/.test(s) && s.length >= 42) {
    try {
      const buf = Buffer.from(s, "hex")
      const little = buf.readUInt8(0) === 1
      const readU32 = (o: number) => (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o))
      const readF64 = (o: number) => (little ? buf.readDoubleLE(o) : buf.readDoubleBE(o))

      let offset = 1
      const type = readU32(offset)
      offset += 4
      // High bit 0x20000000 signals an embedded SRID we need to skip.
      if (type & 0x20000000) offset += 4

      const lng = readF64(offset)
      const lat = readF64(offset + 8)
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
    } catch {
      return null
    }
  }

  return null
}

// Great-circle distance in kilometres (haversine).
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}
