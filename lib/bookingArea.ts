// Rough heuristic only — addresses are free text and there's no dedicated
// area/city column, so we bucket by the last comma-separated segment (usually
// the city/area/village). Shared by the admin dashboard's "Top areas" widget
// and the customer-facing schedule card, so the two can't drift apart.
export function extractArea(address: string): string | null {
  const parts = address.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length === 0) return null
  return parts[parts.length - 1]
}
