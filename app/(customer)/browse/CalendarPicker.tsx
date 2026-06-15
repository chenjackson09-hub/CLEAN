'use client'
import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'

const AVAILABILITY: Record<number, 'high' | 'medium' | 'low'> = {
  0: 'low', 1: 'high', 2: 'high', 3: 'high', 4: 'high', 5: 'medium', 6: 'medium',
}

function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function CalendarPicker() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const { lang, messages, t } = useLanguage()

  const MONTH_NAMES = messages.calendar.monthNames
  const DAY_NAMES = messages.calendar.dayNames

  const selectedSet = new Set(
    (searchParams.get('dates') ?? '').split(',').filter(Boolean)
  )

  const todayRaw = new Date()
  todayRaw.setHours(0, 0, 0, 0)
  const todayStr = formatDate(todayRaw.getFullYear(), todayRaw.getMonth(), todayRaw.getDate())

  const [viewYear, setViewYear] = useState(todayRaw.getFullYear())
  const [viewMonth, setViewMonth] = useState(todayRaw.getMonth())

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function handleSelect(dateStr: string) {
    const next = new Set(selectedSet)
    if (next.has(dateStr)) next.delete(dateStr)
    else next.add(dateStr)

    const params = new URLSearchParams(searchParams.toString())
    if (next.size === 0) {
      params.delete('dates')
    } else {
      params.set('dates', Array.from(next).sort().join(','))
    }
    startTransition(() => router.push(`/browse?${params}`))
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('dates')
    startTransition(() => router.push(`/browse?${params}`))
  }

  function formatLabel(dateStr: string) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(
      lang === 'he' ? 'he-IL' : 'en-US',
      { month: 'short', day: 'numeric' }
    )
  }

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const sortedSelected = Array.from(selectedSet).sort()

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Previous month"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="font-semibold text-gray-900 text-sm">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          aria-label="Next month"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />

          const dateStr = formatDate(viewYear, viewMonth, day)
          const date = new Date(viewYear, viewMonth, day)
          const isPast = dateStr < todayStr
          const isToday = dateStr === todayStr
          const isSelected = selectedSet.has(dateStr)
          const avail = AVAILABILITY[date.getDay()]

          let cls = 'flex items-center justify-center w-9 h-9 mx-auto rounded-full text-sm font-medium transition-colors select-none '
          if (isPast) cls += 'text-gray-300 cursor-not-allowed'
          else if (isSelected) cls += 'bg-blue-600 text-white cursor-pointer shadow-sm'
          else if (isToday) cls += 'ring-2 ring-blue-500 text-blue-700 cursor-pointer hover:bg-blue-50'
          else if (avail === 'high') cls += 'bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200'
          else if (avail === 'medium') cls += 'bg-blue-50 text-blue-600 cursor-pointer hover:bg-blue-100'
          else cls += 'bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200'

          return (
            <button
              key={i}
              disabled={isPast}
              onClick={() => !isPast && handleSelect(dateStr)}
              className={cls}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Color legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded-full bg-blue-100 inline-block" />
          {t('calendar.manyCleaners')}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded-full bg-blue-50 border border-blue-200 inline-block" />
          {t('calendar.fewerCleaners')}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="w-3 h-3 rounded-full bg-gray-100 inline-block" />
          {t('calendar.limited')}
        </div>
      </div>

      {/* Selected dates summary */}
      {sortedSelected.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {sortedSelected.length === 1
                ? t('calendar.dateSelected')
                : t('calendar.datesSelected').replace('{n}', String(sortedSelected.length))}
            </span>
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              {t('calendar.clearAll')}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sortedSelected.map(d => (
              <button
                key={d}
                onClick={() => handleSelect(d)}
                className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors"
              >
                {formatLabel(d)}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
