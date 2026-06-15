import Link from 'next/link'
import type { CleanerResult } from '@/lib/types/cleaner'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const SERVICE_BADGE: Record<string, string> = {
  residential: 'bg-indigo-100 text-indigo-700',
  commercial: 'bg-green-100 text-green-700',
  both: 'bg-yellow-100 text-yellow-800',
}

const SERVICE_ACCENT: Record<string, string> = {
  residential: 'border-t-indigo-400',
  commercial: 'border-t-green-400',
  both: 'border-t-yellow-400',
}

export function CleanerCard({ cleaner }: { cleaner: CleanerResult }) {
  const { t } = useLanguage()
  const initial = cleaner.full_name.charAt(0).toUpperCase()
  const bioExcerpt = cleaner.bio.length > 80 ? cleaner.bio.slice(0, 80) + '…' : cleaner.bio
  const serviceLabel =
    cleaner.service_types.includes('residential') && cleaner.service_types.includes('commercial')
      ? 'both'
      : cleaner.service_types[0] ?? 'residential'

  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 border-t-4 ${SERVICE_ACCENT[serviceLabel]} hover:shadow-lg transition-shadow`}>
      <div className="flex items-center gap-3 mb-3">
        {cleaner.avatar_url ? (
          <img
            src={cleaner.avatar_url}
            alt={cleaner.full_name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center font-bold text-white">
            {initial}
          </div>
        )}
        <div>
          <p className="font-bold text-gray-900">{cleaner.full_name}</p>
          <p className="text-sm text-gray-500">
            {t('common.kmAway', { km: cleaner.distance_km.toFixed(1) })} · {t('common.yearsExp', { years: cleaner.years_experience })}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-3 leading-relaxed">"{bioExcerpt}"</p>

      <div className="flex gap-2 flex-wrap mb-3">
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${SERVICE_BADGE[serviceLabel]}`}>
          {t(`common.${serviceLabel}`)}
        </span>
        {cleaner.area && (
          <span className="text-xs px-2 py-0.5 rounded bg-pink-100 text-pink-700 font-medium">
            📍 {cleaner.area}
          </span>
        )}
        {cleaner.languages.length > 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
            🌐 {cleaner.languages.join(', ')}
          </span>
        )}
      </div>

      <div className="flex justify-between items-center">
        <span className="font-bold text-gray-900">₪{cleaner.hourly_rate}{t('common.perHour')}</span>
        <Link
          href={`/cleaners/${cleaner.id}`}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
        >
          {t('cleanerCard.viewProfile')}
        </Link>
      </div>
    </div>
  )
}
