'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { CleanerCard } from './CleanerCard'
import type { CleanerResult } from '@/lib/types/cleaner'

type Props = {
  hasFilters: boolean
  error: boolean
  cleaners: CleanerResult[] | null
  location?: string
}

export function BrowseResults({ hasFilters, error, cleaners, location }: Props) {
  const { t } = useLanguage()

  return (
    <div className="px-6 py-6">
      {error && (
        <p className="text-red-600 text-sm">{t('browse.error')}</p>
      )}

      {!hasFilters && !error && (
        <p className="text-gray-500 text-sm">{t('browse.useFilters')}</p>
      )}

      {hasFilters && !error && cleaners?.length === 0 && (
        <p className="text-gray-500 text-sm">{t('browse.noResults')}</p>
      )}

      {cleaners && cleaners.length > 0 && (
        <>
          <p className="text-sm text-gray-600 mb-4">
            {t(cleaners.length === 1 ? 'browse.cleanerFound' : 'browse.cleanersFound', { count: cleaners.length })}
            {location && <> {t('browse.in')}<span className="font-semibold text-purple-600">{location}</span></>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cleaners.map(c => <CleanerCard key={c.id} cleaner={c} />)}
          </div>
        </>
      )}
    </div>
  )
}
