'use client'
import Link from 'next/link'
import { BookingRequestForm } from './BookingRequestForm'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { CleanerResult } from '@/lib/types/cleaner'

const SERVICE_BADGE: Record<string, string> = {
  residential: 'bg-indigo-100 text-indigo-700',
  commercial: 'bg-green-100 text-green-700',
}

export function CleanerProfile({ cleaner }: { cleaner: CleanerResult }) {
  const { t } = useLanguage()
  const initial = cleaner.full_name.charAt(0).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/browse" className="text-sm text-indigo-600 hover:underline mb-4 inline-block">
        {t('cleanerProfile.backToBrowse')}
      </Link>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center gap-4 mb-4">
          {cleaner.avatar_url ? (
            <img
              src={cleaner.avatar_url}
              alt={cleaner.full_name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white text-2xl">
              {initial}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{cleaner.full_name}</h1>
            <p className="text-sm text-gray-500">
              {t('common.kmAway', { km: cleaner.distance_km.toFixed(1) })} · {t('common.yearsExp', { years: cleaner.years_experience })}
              {cleaner.area && <> · 📍 {cleaner.area}</>}
            </p>
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed mb-4">{cleaner.bio}</p>

        <div className="flex gap-2 flex-wrap mb-4">
          {cleaner.service_types.map(type => (
            <span key={type} className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_BADGE[type] ?? 'bg-gray-100 text-gray-700'}`}>
              {t(`common.${type}`)}
            </span>
          ))}
          {cleaner.languages.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
              🌐 {cleaner.languages.join(', ')}
            </span>
          )}
        </div>

        <BookingRequestForm cleaner={cleaner} />
      </div>
    </div>
  )
}
