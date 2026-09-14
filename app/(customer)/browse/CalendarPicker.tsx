'use client'
import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { CLEAN_COLORS } from '@/lib/cleanColors'
import { DEFAULT_CLEAN_COLOR, parseCleans, serializeCleans, resolveFocusedDate, type CleanGroup } from './cleanGroups'

// Fallback coloring used only when we don't have a real per-date heat map (e.g.
// the customer hasn't saved an address yet). A coarse weekday guess.
const AVAILABILITY: Record<number, 'high' | 'medium' | 'low'> = {
  0: 'low', 1: 'high', 2: 'high', 3: 'high', 4: 'high', 5: 'medium', 6: 'medium',
}

function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

type CalendarPickerProps = {
  // date (YYYY-MM-DD) → coverage bucket, computed server-side from the count of
  // in-range cleaners with availability that day. Empty when no saved location.
  dateHeat?: Record<string, 'high' | 'medium' | 'low'>
  // date → the live status of the booking already sent for it (if any), so the
  // legend can show "1 pending / 1 matched" instead of just a day count.
  bookingStatusByDate?: Record<string, 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed'>
}

// Tapping a day commits immediately (no separate "Search" step) — the whole
// point of the rebuild is that marking a day and seeing who's available for
// it is one action, not two. Filter refinements (range/duration/sort) are a
// separate, explicit commit via BrowseFilters' own Search button.
export function CalendarPicker({ dateHeat = {}, bookingStatusByDate = {} }: CalendarPickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const { lang, messages, t } = useLanguage()

  const MONTH_NAMES = messages.calendar.monthNames
  const DAY_NAMES = messages.calendar.dayNames

  const cleans = parseCleans(searchParams.get('cleans'))
  const focusedDate = resolveFocusedDate(cleans, searchParams.get('focus'))
  const [colorPicker, setColorPicker] = useState(false)

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

  function commit(nextCleans: CleanGroup[], nextFocus: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('dates')
    params.delete('cleanGroup')
    params.delete('cleanColor')
    const serialized = serializeCleans(nextCleans)
    if (nextCleans.length > 0) params.set('cleans', serialized)
    else params.delete('cleans')
    if (nextFocus) params.set('focus', nextFocus)
    else params.delete('focus')
    startTransition(() => router.push(`/browse?${params}`))
  }

  // Tap semantics: an unmarked day joins the most-recently-started clean
  // (Clean 1 by default — created implicitly on the very first tap, no color
  // prompt); tapping the already-focused day again removes it; tapping a
  // different already-marked day just switches focus to it.
  function handleTap(dateStr: string) {
    const owner = cleans.find(g => g.dates.includes(dateStr))
    if (owner) {
      if (dateStr === focusedDate) {
        const updated = cleans
          .map(g => (g.id === owner.id ? { ...g, dates: g.dates.filter(d => d !== dateStr) } : g))
          .filter(g => g.dates.length > 0)
        const remaining = updated.flatMap(g => g.dates).sort()
        commit(updated, remaining[0] ?? null)
      } else {
        commit(cleans, dateStr)
      }
      return
    }
    let updated: CleanGroup[]
    if (cleans.length === 0) {
      updated = [{ id: crypto.randomUUID(), color: DEFAULT_CLEAN_COLOR, dates: [dateStr] }]
    } else {
      const activeIdx = cleans.length - 1
      updated = cleans.map((g, i) => (i === activeIdx ? { ...g, dates: [...g.dates, dateStr].sort() } : g))
    }
    commit(updated, dateStr)
  }

  function addClean(color: string) {
    setColorPicker(false)
    commit([...cleans, { id: crypto.randomUUID(), color, dates: [] }], focusedDate)
  }

  function focusClean(group: CleanGroup) {
    const first = [...group.dates].sort()[0]
    if (first) commit(cleans, first)
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

  const usedColors = cleans.map(g => g.color)
  const availableColors = CLEAN_COLORS.filter(c => !usedColors.includes(c))
  const palette = availableColors.length > 0 ? availableColors : CLEAN_COLORS

  const statusLabel: Record<string, string> = {
    pending: t('browse.cleanStatusPending'),
    accepted: t('browse.cleanStatusAccepted'),
    completed: t('browse.cleanStatusAccepted'),
    declined: t('browse.cleanStatusDeclined'),
    cancelled: t('browse.cleanStatusCancelled'),
  }

  return (
    <div className="mb-4">
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
        <span className="font-semibold text-gray-900 text-xl">
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
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />

          const dateStr = formatDate(viewYear, viewMonth, day)
          const date = new Date(viewYear, viewMonth, day)
          const isPast = dateStr < todayStr
          const isToday = dateStr === todayStr
          const owner = cleans.find(g => g.dates.includes(dateStr))
          const isFocused = dateStr === focusedDate
          // Prefer the real in-range heat map; fall back to the weekday guess
          // for dates outside the computed window or when no location is saved.
          const avail = dateHeat[dateStr] ?? AVAILABILITY[date.getDay()]

          let cls = 'flex items-center justify-center w-full aspect-square rounded-xl text-sm sm:text-base font-medium transition-colors select-none '
          if (isPast) cls += 'text-gray-300 cursor-not-allowed'
          else if (owner) cls += `cursor-pointer text-white shadow-sm ${isFocused ? 'ring-2 ring-offset-1 ring-gray-900' : ''}`
          else if (isToday) cls += 'ring-2 ring-blue-500 text-blue-700 cursor-pointer hover:bg-blue-50'
          else if (avail === 'high') cls += 'bg-blue-200 text-blue-800 cursor-pointer hover:bg-blue-200'
          else if (avail === 'medium') cls += 'bg-blue-100 text-blue-600 cursor-pointer hover:bg-blue-100'
          else cls += 'bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200'

          return (
            <button
              key={i}
              disabled={isPast || isPending}
              onClick={() => !isPast && handleTap(dateStr)}
              className={cls}
              style={owner ? { backgroundColor: owner.color } : undefined}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Color legend for coverage (unchanged) */}
      <div className="bg-white p-3 shadow-sm flex items-center gap-4 mt-3 pt-3 rounded-xl flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <span className="w-3 h-3 rounded-full bg-blue-100 inline-block" />
          {t('calendar.manyCleaners')}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <span className="w-3 h-3 rounded-full bg-blue-50 border border-blue-200 inline-block" />
          {t('calendar.fewerCleaners')}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <span className="w-3 h-3 rounded-full bg-gray-100 inline-block" />
          {t('calendar.limited')}
        </div>
      </div>

      {cleans.length === 0 && (
        <p className="text-sm text-gray-500 mt-3">{t('browse.tapDayHint')}</p>
      )}

      {/* Clean legend: one chip per clean, click to jump focus to its earliest
          day, plus a "+" to start another clean (only appears once Clean 1
          exists — no upfront color step for the first one). */}
      {cleans.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {cleans.map((g, i) => {
            const statuses = g.dates.map(d => bookingStatusByDate[d]).filter(Boolean) as string[]
            const statusSummary = statuses.length > 0
              ? statuses.map(s => statusLabel[s]).join(' · ')
              : (g.dates.length === 1 ? t('browse.dayCountOne') : t('browse.dayCountOther').replace('{n}', String(g.dates.length)))
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => focusClean(g)}
                className="flex items-center gap-1.5 bg-white shadow-sm rounded-full pl-1.5 pr-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                {t('browse.cleanLabel').replace('{n}', String(i + 1))}
                <span className="text-gray-400 font-normal">· {statusSummary}</span>
              </button>
            )
          })}

          <div className="relative">
            <button
              type="button"
              onClick={() => setColorPicker(o => !o)}
              className="flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors"
              aria-label={t('browse.addClean')}
            >
              +
            </button>
            {colorPicker && (
              <div className="absolute z-10 top-9 start-0 bg-white rounded-xl shadow-lg p-3 flex flex-col gap-2 w-48">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {t('browse.pickColorForClean').replace('{n}', String(cleans.length + 1))}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {palette.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => addClean(c)}
                      aria-label={c}
                      className="w-7 h-7 rounded-full hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
