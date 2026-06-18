import { parsePoint, distanceKm } from "./geo"

// Build a little-endian EWKB hex string for POINT(lng lat) with SRID 4326,
// matching the format supabase-js returns for a geography(Point) column.
function ewkb(lng: number, lat: number): string {
  const buf = Buffer.alloc(1 + 4 + 4 + 8 + 8)
  buf.writeUInt8(1, 0) // little-endian
  buf.writeUInt32LE(0x20000001, 1) // point type + SRID flag
  buf.writeUInt32LE(4326, 5) // SRID
  buf.writeDoubleLE(lng, 9)
  buf.writeDoubleLE(lat, 17)
  return buf.toString("hex")
}

describe("parsePoint", () => {
  it("parses EWKB hex (lng, lat order) from PostGIS", () => {
    const p = parsePoint(ewkb(34.7818, 32.0853))
    expect(p).not.toBeNull()
    expect(p!.lng).toBeCloseTo(34.7818, 4)
    expect(p!.lat).toBeCloseTo(32.0853, 4)
  })

  it("parses WKT POINT(lng lat)", () => {
    expect(parsePoint("POINT(34.78 32.08)")).toEqual({ lng: 34.78, lat: 32.08 })
  })

  it("parses GeoJSON", () => {
    expect(parsePoint({ type: "Point", coordinates: [34.78, 32.08] })).toEqual({
      lng: 34.78,
      lat: 32.08,
    })
  })

  it("returns null for empty or malformed values", () => {
    expect(parsePoint(null)).toBeNull()
    expect(parsePoint("")).toBeNull()
    expect(parsePoint("not a point")).toBeNull()
  })
})

describe("distanceKm", () => {
  it("is ~0 for the same point", () => {
    const p = { lat: 32.08, lng: 34.78 }
    expect(distanceKm(p, p)).toBeCloseTo(0, 5)
  })

  it("matches a known distance (Tel Aviv → Jerusalem ≈ 54km)", () => {
    const telAviv = { lat: 32.0853, lng: 34.7818 }
    const jerusalem = { lat: 31.7683, lng: 35.2137 }
    expect(distanceKm(telAviv, jerusalem)).toBeGreaterThan(48)
    expect(distanceKm(telAviv, jerusalem)).toBeLessThan(60)
  })
})
