'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { localityName } from '@/lib/locations'

// "Showing people in Beit Hillel ✕" — the Customers/Cleaners pages show this when
// opened from Locations (?locality=<id>). Clearing it returns the full list; the
// back link returns to the exact Locations view (search/filters) that sent you here.
export function LocalityFilterChip({ locality, clearHref, backHref }: {
  locality: { name_he: string; name_en: string | null; name_en_display: string | null }
  clearHref: string
  backHref: string | null
}) {
  const { t, lang } = useLanguage()
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
      {backHref && (
        <Link href={backHref} className="font-semibold text-blue-600 hover:underline">{t('admin.locations.chip.back')}</Link>
      )}
      <span className="inline-flex items-center gap-2 bg-white rounded-full shadow-sm ps-3 pe-1.5 py-1 text-gray-700">
        <span>📍 {t('admin.locations.chip.showing', { place: localityName(locality, lang) })}</span>
        <Link href={clearHref} aria-label={t('admin.locations.chip.clear')} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600">✕</Link>
      </span>
    </div>
  )
}
