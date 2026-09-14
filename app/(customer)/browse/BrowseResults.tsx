'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { CleanerCard } from './CleanerCard'
import { findOwningClean, type CleanGroup } from './cleanGroups'
import type { DateGroup } from '@/lib/types/cleaner'

type Props = {
  hasDates: boolean
  hasLocation: boolean
  locationError: boolean
  location?: string
  duration?: number
  availFrom?: string
  availTo?: string
  groups: DateGroup[] | null
  cleans: CleanGroup[]
  focusedDate: string | null
}

// Shows exactly one day's results at a time — whichever day is focused on the
// calendar above — instead of an accordion of every selected date. Matches
// the stakeholder mockup's "Clean 1 — Tue 17 June · 5 available" panel
// directly under the calendar.
export function BrowseResults({ hasDates, hasLocation, locationError, location, duration, availFrom, availTo, groups, cleans, focusedDate }: Props) {
  const { t, lang } = useLanguage()

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(
      lang === 'he' ? 'he-IL' : 'en-US',
      { weekday: 'long', month: 'short', day: 'numeric' }
    )
  }

  if (locationError) {
    return (
      <p className="text-amber-700 bg-amber-50 rounded-xl px-3 py-2 text-sm">
        {t('browse.locationNotFound')}{' '}
        <Link href="/profile" className="font-semibold text-blue-600 hover:underline">
          {t('browse.goToProfile')}
        </Link>
      </p>
    )
  }

  if (!hasLocation) {
    return (
      <p className="text-gray-600 text-sm">
        {t('browse.enterLocation')}{' '}
        <Link href="/profile" className="font-semibold text-blue-600 hover:underline">
          {t('browse.goToProfile')}
        </Link>
      </p>
    )
  }

  if (!hasDates || !focusedDate || !groups) {
    return <p className="text-gray-600 text-sm">{t('browse.selectDate')}</p>
  }

  const focusedGroup = groups.find(g => g.date === focusedDate)
  const owningClean = findOwningClean(cleans, focusedDate)
  const cleanIndex = owningClean ? cleans.findIndex(g => g.id === owningClean.id) : -1
  const count = focusedGroup?.cleaners.length ?? 0

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          {owningClean && <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: owningClean.color }} />}
          <span className="font-semibold text-gray-900 truncate">
            {cleanIndex >= 0 && `${t('browse.cleanLabel').replace('{n}', String(cleanIndex + 1))} — `}
            {formatDate(focusedDate)}
          </span>
        </div>
        <span className={`text-sm shrink-0 ${count === 0 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
          {count === 1 ? t('browse.cleanerFound') : t('browse.cleanersFound').replace('{count}', String(count))}
        </span>
      </div>

      <div className="px-4 py-4">
        {count === 0 ? (
          <p className="text-gray-500 text-sm py-2">{t('browse.noneThisDay')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {focusedGroup!.cleaners.map(c => (
              <CleanerCard
                key={c.id}
                cleaner={c}
                date={focusedDate}
                location={location}
                duration={duration}
                availFrom={availFrom}
                availTo={availTo}
                cleanGroupId={owningClean?.id}
                cleanGroupColor={owningClean?.color}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
