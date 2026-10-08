// A quick stand-in for driving distance: roads are rarely straight, so the
// straight-line (haversine) distance is scaled up by a typical detour factor.
// e.g. Beit Hillel → Metula is ~10 km straight and ~12 km by road. It's an
// estimate (hills, the Kinneret and the border can make a route much longer),
// not a routing result — a real routing service could replace it later behind
// these two functions without touching any caller.
export const ROAD_DETOUR_FACTOR = 1.2

// Straight-line km → estimated road km.
export function estimateRoadKm(straightKm: number): number {
  return straightKm * ROAD_DETOUR_FACTOR
}

// A "road km" radius → the straight-line radius it corresponds to (what the map
// circle is drawn with, so the circle matches who actually shows up in search).
export function straightKmForRoadKm(roadKm: number): number {
  return roadKm / ROAD_DETOUR_FACTOR
}
