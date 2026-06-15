'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Props = {
  dates: string | undefined
  type: string | undefined
  sort: string | undefined
}

export function BrowseFilters({ dates, type, sort }: Props) {
  const { t } = useLanguage()

  return (
    <form method="get" action="/browse" className="flex flex-wrap gap-3 items-end mb-4">
      <input type="hidden" name="dates" value={dates ?? ''} />
      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {t('browse.serviceType')}
        </label>
        <select
          id="type"
          name="type"
          defaultValue={type ?? ''}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('browse.sortDefault')}</option>
          <option value="price_asc">{t('browse.priceLow')}</option>
          <option value="price_desc">{t('browse.priceHigh')}</option>
          <option value="experience_desc">{t('browse.mostExp')}</option>
          <option value="experience_asc">{t('browse.leastExp')}</option>
        </select>
      </div>
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
      >
        {t('browse.filter')}
      </button>
    </form>
  )
}
