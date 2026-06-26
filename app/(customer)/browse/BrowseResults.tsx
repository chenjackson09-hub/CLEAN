'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { CleanerCard } from './CleanerCard'
import type { DateGroup } from '@/lib/types/cleaner'

type Props = {
  hasDates: boolean
  hasLocation: boolean
  locationError: boolean
  location?: string
  groups: DateGroup[] | null
}

export function BrowseResults({ hasDates, hasLocation, locationError, location, groups }: Props) {
  const { t, lang } = useLanguage()

  // Open the first day that actually has cleaners by default (fall back to the
  // first selected day).
  const [open, setOpen] = useState<Set<string>>(() => {
    const initial = groups?.find(g => g.cleaners.length > 0)?.date ?? groups?.[0]?.date
    return new Set(initial ? [initial] : [])
  })

  function toggle(date: string) {
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(
      lang === 'he' ? 'he-IL' : 'en-US',
      { weekday: 'long', month: 'short', day: 'numeric' }
    )
  }

  const total = groups?.reduce((n, g) => n + g.cleaners.length, 0) ?? 0

  return (
    <div>
      {locationError && (
        <p className="text-amber-700 bg-amber-50 rounded-xl px-3 py-2 text-sm">
          {t('browse.locationNotFound')}{' '}
          <Link href="/profile" className="font-semibold text-blue-600 hover:underline">
            {t('browse.goToProfile')}
          </Link>
        </p>
      )}

      {!hasLocation && !locationError && (
        <p className="text-gray-600 text-sm">
          {t('browse.enterLocation')}{' '}
          <Link href="/profile" className="font-semibold text-blue-600 hover:underline">
            {t('browse.goToProfile')}
          </Link>
        </p>
      )}

      {hasLocation && !hasDates && !locationError && (
        <p className="text-gray-600 text-sm">{t('browse.selectDate')}</p>
      )}

      {hasLocation && !locationError && groups && total === 0 && (
        <p className="text-gray-500 text-sm">{t('browse.noResults')}</p>
      )}

      {hasLocation && !locationError && groups && total > 0 && (
        <div className="space-y-3">
          {groups.map(g => {
            const isOpen = open.has(g.date)
            const count = g.cleaners.length
            return (
              <div key={g.date} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(g.date)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{formatDate(g.date)}</span>
                  <span className={`flex items-center gap-2 text-sm ${count === 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                    {count === 1
                      ? t('browse.cleanerFound')
                      : t('browse.cleanersFound').replace('{count}', String(count))}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    {count === 0 ? (
                      <p className="text-gray-500 text-sm py-2">{t('browse.noneThisDay')}</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {g.cleaners.map(c => <CleanerCard key={c.id} cleaner={c} date={g.date} location={location} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
