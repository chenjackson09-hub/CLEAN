'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { CleanerCard } from './CleanerCard'
import type { CleanerResult } from '@/lib/types/cleaner'

type Props = {
  hasFilters: boolean
  error: boolean
  cleaners: CleanerResult[] | null
}

export function BrowseResults({ hasFilters, error, cleaners }: Props) {
  const { t } = useLanguage()

  return (
    <div>
      {error && (
        <p className="text-red-600 text-sm">{t('browse.error')}</p>
      )}

      {!hasFilters && !error && (
        <p className="text-gray-600 text-sm">{t('browse.selectDate')}</p>
      )}

      {hasFilters && !error && cleaners?.length === 0 && (
        <p className="text-gray-500 text-sm">{t('browse.noResultsDates')}</p>
      )}

      {cleaners && cleaners.length > 0 && (
        <>
          <p className="text-sm text-gray-600 mb-4">
            {cleaners.length === 1
              ? t('browse.cleanerFound')
              : t('browse.cleanersFound').replace('{count}', String(cleaners.length))}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cleaners.map(c => <CleanerCard key={c.id} cleaner={c} />)}
          </div>
        </>
      )}
    </div>
  )
}
