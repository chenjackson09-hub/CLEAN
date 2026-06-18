'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Props = {
  dates: string | undefined
  type: string | undefined
  sort: string | undefined
  start: string | undefined
  duration: string | undefined
  location: string | undefined
}

// Start-time options every 30 minutes from 06:00 to 22:00.
const START_OPTIONS = Array.from({ length: 33 }, (_, i) => {
  const mins = 6 * 60 + i * 30
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
})
const DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]

export function BrowseFilters({ dates, type, sort, start, duration, location }: Props) {
  const { t } = useLanguage()

  return (
    <form method="get" action="/browse" className="flex flex-wrap gap-3 items-end mb-4">
      <input type="hidden" name="dates" value={dates ?? ''} />
      <div className="flex flex-col gap-1">
        <label htmlFor="start" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {t('filterBar.startTime')}
        </label>
        <select
          id="start"
          name="start"
          defaultValue={start ?? ''}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('filterBar.anyStartTime')}</option>
          {START_OPTIONS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="duration" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {t('filterBar.duration')}
        </label>
        <select
          id="duration"
          name="duration"
          defaultValue={duration ?? '2'}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DURATION_OPTIONS.map(d => (
            <option key={d} value={d}>{d}{t('filterBar.hoursShort')}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="location" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {t('browse.location')}
        </label>
        <input
          id="location"
          name="location"
          type="text"
          required
          defaultValue={location ?? ''}
          placeholder={t('browse.locationPlaceholder')}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {t('browse.serviceType')}
        </label>
        <select
          id="type"
          name="type"
          defaultValue={type ?? ''}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('browse.allTypes')}</option>
          <option value="residential">{t('browse.residential')}</option>
          <option value="commercial">{t('browse.commercial')}</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="sort" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {t('browse.sortBy')}
        </label>
        <select
          id="sort"
          name="sort"
          defaultValue={sort ?? ''}
          className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('browse.sortDefault')}</option>
          <option value="distance_asc">{t('browse.nearest')}</option>
          <option value="price_asc">{t('browse.priceLow')}</option>
          <option value="price_desc">{t('browse.priceHigh')}</option>
          <option value="experience_desc">{t('browse.mostExp')}</option>
          <option value="experience_asc">{t('browse.leastExp')}</option>
        </select>
      </div>
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
      >
        {t('browse.filter')}
      </button>
      <Link
        href="/browse"
        className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
      >
        {t('browse.clear')}
      </Link>
    </form>
  )
}
