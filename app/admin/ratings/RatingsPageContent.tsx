'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { StarRatingDisplay } from '@/components/StarRating'

export type RecentRating = {
  id: string
  score: number
  created_at: string
  raterName: string
  rateeName: string
  rateeRole: string
}

function RatingStatCard({ label, avg, count }: { label: string; avg: number | null; count: number }) {
  const { t } = useLanguage()
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col items-center text-center gap-1">
      <div className="text-sm font-semibold text-gray-600">{label}</div>
      <div className="text-3xl font-bold text-gray-900">{avg == null ? '—' : `${avg.toFixed(1)} ★`}</div>
      {count > 0 && <div className="text-xs text-gray-400">{t('admin.dashboard.ratingSub', { count })}</div>}
    </div>
  )
}

export function RatingsPageContent({
  overallAvg,
  overallCount,
  cleanersAvg,
  cleanersCount,
  customersAvg,
  customersCount,
  recentRatings,
}: {
  overallAvg: number | null
  overallCount: number
  cleanersAvg: number | null
  cleanersCount: number
  customersAvg: number | null
  customersCount: number
  recentRatings: RecentRating[]
}) {
  const { t, lang } = useLanguage()
  const dateLocale = lang === 'he' ? 'he-IL' : 'en-US'

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('admin.ratings.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('admin.ratings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <RatingStatCard label={t('admin.ratings.overall')} avg={overallAvg} count={overallCount} />
        <RatingStatCard label={t('admin.ratings.cleaners')} avg={cleanersAvg} count={cleanersCount} />
        <RatingStatCard label={t('admin.ratings.customers')} avg={customersAvg} count={customersCount} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">{t('admin.ratings.recentTitle')}</h2>
        {recentRatings.length === 0 ? (
          <p className="text-sm text-gray-400">{t('admin.ratings.empty')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100">
            {recentRatings.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 truncate">
                    {t('admin.ratings.rated', { rater: r.raterName || '—', ratee: r.rateeName || '—' })}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <StarRatingDisplay value={r.score} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
