'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { AvailabilityRange } from './AvailabilityRange'

type Props = {
  dates: string | undefined
  sort: string | undefined
  from: string | undefined
  to: string | undefined
  duration: string | undefined
}

const DURATION_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]
// Default availability window — the full working day (no effective constraint).
const DEFAULT_FROM = '06:00'
const DEFAULT_TO = '22:00'

export function BrowseFilters({ dates, sort, from, to, duration }: Props) {
  const { t } = useLanguage()
  const router = useRouter()
  // Optional refinements (availability range, duration, type, sort) — collapsed
  // by default. Location now comes from the customer's profile, not a field here.
  const [open, setOpen] = useState(false)
  // Controlled so the Clear button can visually reset the inputs. Uncontrolled
  // ones keep their DOM value across a /browse navigation, so clearing the URL
  // alone wouldn't move them back to their defaults.
  const [fromVal, setFromVal] = useState(from ?? DEFAULT_FROM)
  const [toVal, setToVal] = useState(to ?? DEFAULT_TO)
  const [durationVal, setDurationVal] = useState(duration ?? 'any')
  const [sortVal, setSortVal] = useState(sort ?? '')

  function handleClear() {
    setFromVal(DEFAULT_FROM)
    setToVal(DEFAULT_TO)
    setDurationVal('any')
    setSortVal('')
    router.push('/browse')
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm mb-4">
      {/* Dropdown toggle */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
      >
        <span className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18M6 12h12M10 19.5h4" />
          </svg>
          {t('browse.filter')}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <form id="browse-search-form" method="get" action="/browse" className="border-t border-gray-100 px-4 py-4 flex flex-wrap gap-3 justify-start items-end">
          <input type="hidden" name="dates" value={dates ?? ''} />
          <div className="flex flex-col gap-1">
            {/* Not a <label>: the range is a composite widget (two thumbs), not a
                single form field, so it's labelled as a group via aria-labelledby. */}
            <span id="availability-label" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {t('filterBar.availability')}
            </span>
            <AvailabilityRange
              from={fromVal}
              to={toVal}
              labelledBy="availability-label"
              onChange={(f, to2) => { setFromVal(f); setToVal(to2) }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="duration" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {t('filterBar.duration')}
            </label>
            <select
              id="duration"
              name="duration"
              value={durationVal}
              onChange={e => setDurationVal(e.target.value)}
              className="h-10 border border-gray-300 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="any">{t('filterBar.durationNotSure')}</option>
              {DURATION_OPTIONS.map(d => (
                <option key={d} value={d}>{d}{t('filterBar.hoursShort')}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="sort" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {t('browse.sortBy')}
            </label>
            <select
              id="sort"
              name="sort"
              value={sortVal}
              onChange={e => setSortVal(e.target.value)}
              className="h-10 border border-gray-300 rounded-xl px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            type="button"
            onClick={handleClear}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            {t('browse.clear')}
          </button>
        </form>
      )}
    </div>
  )
}
