'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// Rough heuristic only — addresses are free text and there's no dedicated
// area/city column, so we bucket by the last comma-separated segment (usually
// the city/area). Good enough for a "what's trending" widget, not exact.
function extractArea(address: string): string | null {
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return null
  return parts[parts.length - 1]
}

export function TopAreasWidget({ addresses }: { addresses: string[] }) {
  const { t } = useLanguage()

  const counts = new Map<string, number>()
  for (const address of addresses) {
    const area = extractArea(address)
    if (!area) continue
    counts.set(area, (counts.get(area) ?? 0) + 1)
  }
  const topAreas = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">{t('admin.dashboard.topAreas')}</h2>
      {topAreas.length === 0 ? (
        <p className="text-sm text-gray-400">{t('admin.dashboard.topAreasEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {topAreas.map(([area, count]) => (
            <li key={area} className="flex justify-between text-sm text-gray-700">
              <span>{area}</span>
              <span className="font-semibold">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
