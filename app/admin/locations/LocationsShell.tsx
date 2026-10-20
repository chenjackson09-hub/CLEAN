'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { Tab } from '@/lib/locations'

// Page heading + the two tabs. Each tab is a plain link (the tab lives in the URL).
export function LocationsShell({ tab, setupNeeded, children }: { tab: Tab; setupNeeded: boolean; children: React.ReactNode }) {
  const { t } = useLanguage()
  const tabs: { key: Tab; href: string }[] = [
    { key: 'manage', href: '/admin/locations' },
    { key: 'regions', href: '/admin/locations?tab=regions' },
  ]
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">📍 {t('admin.locations.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('admin.locations.subtitle')}</p>
      </div>

      <div className="flex gap-2 mb-5" role="tablist">
        {tabs.map((x) => (
          <Link
            key={x.key}
            href={x.href}
            role="tab"
            aria-selected={tab === x.key}
            className={`text-sm font-semibold px-3.5 py-1.5 rounded-full transition ${
              tab === x.key ? 'bg-[#75C9C8] text-white' : 'bg-white text-gray-600 hover:bg-[#F7F4EA]'
            }`}
          >
            {t(`admin.locations.tabs.${x.key}`)}
          </Link>
        ))}
      </div>

      {setupNeeded ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 p-4 text-sm">{t('admin.locations.setupNeeded')}</div>
      ) : (
        children
      )}
    </div>
  )
}
