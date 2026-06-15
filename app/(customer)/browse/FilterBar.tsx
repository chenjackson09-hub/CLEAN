'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'

type Props = {
  defaultValues?: { days?: number[]; timeOfDay?: string[]; type: string; location?: string; sort?: string }
}

export function FilterBar({ defaultValues }: Props) {
  const router = useRouter()
  const { t, messages } = useLanguage()

  const DAYS = messages.filterBar.dayNames

  const TIME_OF_DAY = [
    { value: 'morning', label: t('filterBar.morning') },
    { value: 'noon', label: t('filterBar.noon') },
    { value: 'evening', label: t('filterBar.evening') },
    { value: 'night', label: t('filterBar.night') },
  ]

  const SORT_OPTIONS = [
    { value: 'price_asc', label: t('filterBar.priceLowToHigh') },
    { value: 'price_desc', label: t('filterBar.priceHighToLow') },
    { value: 'experience_desc', label: t('filterBar.experienceHighToLow') },
    { value: 'experience_asc', label: t('filterBar.experienceLowToHigh') },
  ]

  const [days, setDays] = useState<number[]>(defaultValues?.days ?? [])
  const [daysOpen, setDaysOpen] = useState(false)
  const [timeOfDay, setTimeOfDay] = useState<string[]>(defaultValues?.timeOfDay ?? [])
  const [timeOpen, setTimeOpen] = useState(false)
  const [type, setType] = useState(defaultValues?.type ?? '')
  const [location, setLocation] = useState(defaultValues?.location ?? '')
  const [sort, setSort] = useState(defaultValues?.sort ?? '')

  function toggleDay(i: number) {
    setDays(prev =>
      prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort((a, b) => a - b)
    )
  }

  function toggleAllDays() {
    setDays(prev => (prev.length === DAYS.length ? [] : DAYS.map((_, i) => i)))
  }

  function toggleTime(value: string) {
    setTimeOfDay(prev =>
      prev.includes(value)
        ? prev.filter(t => t !== value)
        : [...prev, value].sort(
            (a, b) => TIME_OF_DAY.findIndex(t => t.value === a) - TIME_OF_DAY.findIndex(t => t.value === b)
          )
    )
  }

  function toggleAllTimes() {
    setTimeOfDay(prev => (prev.length === TIME_OF_DAY.length ? [] : TIME_OF_DAY.map(t => t.value)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams({ type })
    if (days.length > 0) params.set('days', days.join(','))
    if (timeOfDay.length > 0) params.set('timeOfDay', timeOfDay.join(','))
    if (location) params.set('location', location)
    if (sort) params.set('sort', sort)
    router.push(`/browse?${params}`)
  }

  function handleClear() {
    setDays([])
    setTimeOfDay([])
    setType('')
    setLocation('')
    setSort('')
    router.push('/browse')
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-4 items-end p-4 bg-white border-b border-gray-200 flex-wrap">
      <div className="flex flex-col gap-1 relative">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('filterBar.days')}</span>
        <button
          type="button"
          onClick={() => setDaysOpen(o => !o)}
          aria-expanded={daysOpen}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm text-start bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[100px]"
        >
          {t('filterBar.days')}{days.length > 0 && ` (${days.length})`}
        </button>
        {daysOpen && (
          <div className="absolute z-10 top-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-2 flex flex-col gap-1 min-w-[140px]">
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-indigo-50 rounded px-1.5 py-1">
              <input
                type="checkbox"
                checked={days.length === DAYS.length}
                onChange={toggleAllDays}
                className="accent-indigo-600"
              />
              {t('filterBar.allDays')}
            </label>
            {DAYS.map((d, i) => (
              <label
                key={i}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-indigo-50 rounded px-1.5 py-1"
              >
                <input
                  type="checkbox"
                  checked={days.includes(i)}
                  onChange={() => toggleDay(i)}
                  className="accent-indigo-600"
                />
                {d}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 relative">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('filterBar.timeOfDay')}</span>
        <button
          type="button"
          onClick={() => setTimeOpen(o => !o)}
          aria-expanded={timeOpen}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm text-start bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[120px]"
        >
          {t('filterBar.timeOfDay')}{timeOfDay.length > 0 && ` (${timeOfDay.length})`}
        </button>
        {timeOpen && (
          <div className="absolute z-10 top-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-2 flex flex-col gap-1 min-w-[140px]">
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-indigo-50 rounded px-1.5 py-1">
              <input
                type="checkbox"
                checked={timeOfDay.length === TIME_OF_DAY.length}
                onChange={toggleAllTimes}
                className="accent-indigo-600"
              />
              {t('filterBar.anytime')}
            </label>
            {TIME_OF_DAY.map(t => (
              <label
                key={t.value}
                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-indigo-50 rounded px-1.5 py-1"
              >
                <input
                  type="checkbox"
                  checked={timeOfDay.includes(t.value)}
                  onChange={() => toggleTime(t.value)}
                  className="accent-indigo-600"
                />
                {t.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('filterBar.serviceType')}</label>
        <select id="type" value={type} onChange={e => setType(e.target.value)} required
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">{t('filterBar.selectType')}</option>
          <option value="residential">{t('common.residential')}</option>
          <option value="commercial">{t('common.commercial')}</option>
          <option value="both">{t('common.both')}</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="location" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('filterBar.location')}</label>
        <input id="location" type="text" value={location} onChange={e => setLocation(e.target.value)}
          placeholder={t('filterBar.locationPlaceholder')}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sort" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('filterBar.sortBy')}</label>
        <select id="sort" value={sort} onChange={e => setSort(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">{t('filterBar.sortDefault')}</option>
          {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <button type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-md font-semibold text-sm transition-colors">
          {t('filterBar.search')}
        </button>
        <button type="button" onClick={handleClear}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-5 py-2 rounded-md font-semibold text-sm transition-colors">
          {t('filterBar.clear')}
        </button>
      </div>
    </form>
  )
}
