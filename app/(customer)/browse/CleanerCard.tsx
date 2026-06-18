'use client'
import Link from 'next/link'
import type { CleanerResult } from '@/lib/types/cleaner'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export function CleanerCard({ cleaner, date, location }: { cleaner: CleanerResult; date?: string; location?: string }) {
  const { t } = useLanguage()
  const initial = cleaner.full_name.charAt(0).toUpperCase()
  // Carry the date this cleaner was matched under and the searched location into
  // the profile/booking flow so the customer doesn't re-enter either.
  const params = new URLSearchParams()
  if (date) params.set('date', date)
  if (location) params.set('location', location)
  const qs = params.toString()
  const href = qs ? `/cleaners/${cleaner.id}?${qs}` : `/cleaners/${cleaner.id}`

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        {cleaner.avatar_url ? (
          <img src={cleaner.avatar_url} alt={cleaner.full_name} className="w-16 h-16 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-xl shrink-0">
            {initial}
          </div>
        )}
        <div>
          <p className="font-bold text-gray-900">{cleaner.full_name}</p>
          <p className="text-sm text-gray-500">
            {cleaner.distance_km > 0 && <>{t('common.kmAway', { km: cleaner.distance_km.toFixed(1) })} · </>}
            {t('common.yearsExp', { years: cleaner.years_experience })}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {cleaner.service_types.map(type => (
          <span key={type} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
            {t(`common.${type}`)}
          </span>
        ))}
        {cleaner.area && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {cleaner.area}
          </span>
        )}
        {cleaner.languages.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
            </svg>
            {cleaner.languages.join(', ')}
          </span>
        )}
      </div>

      <div className="flex justify-between items-center">
        <span className="font-bold text-gray-900">₪{cleaner.hourly_rate}{t('common.perHour')}</span>
        <Link
          href={href}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
        >
          {t('cleanerCard.viewProfile')}
        </Link>
      </div>
    </div>
  )
}
