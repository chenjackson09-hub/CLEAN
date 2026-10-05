'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { DaySheet } from './DaySheet'
import { bookedHours, buildDayModel, openFrameDates, type DayAvailEntry, type HostBooking } from '@/lib/hostCalendar'
import type { CleanerResult } from '@/lib/types/cleaner'

type Props = {
  todayStr: string
  hasLocation: boolean
  locationError: boolean
  location: string
  cleaners: CleanerResult[]
  // date → the cleaners free that day, with their slots
  dayAvail: Record<string, DayAvailEntry[]>
  // the host's own bookings and requests
  bookings: HostBooking[]
}

function ds(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// The host's schedule. Each day shows what is booked (green, with the cleaner's
// hours), what has been requested (orange) and how many cleaners are free (dots).
// Tapping a day opens a sheet to see who is booked/asked/free and to ask someone.
// "Flexible days" lets the host mark several days for ONE clean: requests sent
// from there share a frame, so when one is accepted the rest cancel on their own.
export function HostCalendar({ todayStr, hasLocation, locationError, location, cleaners, dayAvail, bookings }: Props) {
  const router = useRouter()
  const { t, messages } = useLanguage()
  const [view, setView] = useState(() => {
    const [y, m] = todayStr.split('-').map(Number)
    return { y, m: m - 1 }
  })
  const [frameMode, setFrameMode] = useState(false)
  const [frameDays, setFrameDays] = useState<string[]>([])
  const [frameId, setFrameId] = useState<string | undefined>(undefined)
  const [sheet, setSheet] = useState<{ days: string[]; active: string } | null>(null)

  const cleanersById = useMemo(() => new Map(cleaners.map((c) => [c.id, c])), [cleaners])
  const outlined = useMemo(() => {
    const set = openFrameDates(bookings)
    frameDays.forEach((d) => set.add(d))
    return set
  }, [bookings, frameDays])

  const MONTHS = messages.calendar.monthNames
  const WEEKDAYS = messages.calendar.dayNames

  const first = new Date(view.y, view.m, 1).getDay()
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  while (cells.length % 7 !== 0) cells.push(null)
  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))

  function shift(delta: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  function setMode(next: boolean) {
    setFrameMode(next)
    setFrameDays([])
    setFrameId(next ? crypto.randomUUID() : undefined)
  }

  function tap(date: string) {
    if (!frameMode) {
      setSheet({ days: [date], active: date })
      return
    }
    if (date < todayStr) return
    setFrameDays((prev) => (prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date].sort()))
  }

  function closeSheet() {
    setSheet(null)
    // A request may have just been sent — refresh what the calendar shows.
    router.refresh()
  }

  const needsAddress = locationError || !hasLocation

  return (
    <>
      {needsAddress && (
        <p className="shrink-0 mb-1 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-1.5">
          {locationError ? t('browse.locationNotFound') : t('browse.enterLocation')}{' '}
          <Link href="/profile" className="font-semibold text-blue-600 hover:underline">{t('browse.goToProfile')}</Link>
        </p>
      )}

      <div className="shrink-0 flex items-center justify-center gap-2 py-1.5">
        <button type="button" onClick={() => shift(-1)} aria-label="‹" className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-bold flex items-center justify-center">‹</button>
        <h2 className="text-base font-bold text-gray-900 min-w-[150px] text-center">{MONTHS[view.m]} {view.y}</h2>
        <button type="button" onClick={() => shift(1)} aria-label="›" className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-lg font-bold flex items-center justify-center">›</button>
      </div>

      <div className="shrink-0 grid grid-cols-7 gap-1.5 px-1">
        {WEEKDAYS.map((w: string, i: number) => (
          <div key={i} className="text-center text-xs font-bold text-gray-500 py-0.5">{w}</div>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid gap-1.5 p-1" style={{ gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))` }}>
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-7 gap-1.5 min-h-0">
            {row.map((day, ci) => {
              if (day === null) return <div key={ci} />
              const date = ds(view.y, view.m, day)
              const model = buildDayModel(date, bookings, dayAvail)
              const past = date < todayStr
              const isToday = date === todayStr
              const picked = frameDays.includes(date)
              const ring = outlined.has(date) ? 'ring-2 ring-blue-500' : isToday ? 'ring-2 ring-black' : ''

              let tone = 'bg-gray-100 hover:bg-gray-200'
              let label: string | null = null
              let labelClass = ''
              if (model.booked.length > 0) {
                tone = 'bg-green-100 hover:bg-green-200'
                label = bookedHours(model.booked[0]) + (model.booked.length > 1 ? ` +${model.booked.length - 1}` : '')
                labelClass = 'text-green-800'
              } else if (model.requested.length > 0) {
                tone = 'bg-orange-100 hover:bg-orange-200'
                label = t('browse.cellAsked', { n: model.requested.length })
                labelClass = 'text-orange-700'
              } else if (model.free.length > 0 && !past) {
                tone = 'bg-white hover:bg-gray-50'
              }
              if (past) tone += ' opacity-50'

              return (
                <button
                  key={ci}
                  type="button"
                  data-date={date}
                  aria-pressed={frameMode ? picked : undefined}
                  onClick={() => tap(date)}
                  className={`flex flex-col items-center px-0.5 py-1.5 min-h-0 overflow-hidden rounded-xl shadow-md transition-colors ${tone} ${ring} ${picked ? 'bg-blue-50' : ''}`}
                >
                  <span className="text-sm font-bold text-gray-900">{day}</span>
                  {label && <span className={`mt-0.5 text-[10px] font-semibold tabular-nums leading-tight text-center ${labelClass}`}>{label}</span>}
                  {!label && model.free.length > 0 && !past && (
                    <span className="mt-auto text-[8px] leading-none tracking-tighter text-blue-400" aria-label={t('browse.cellFree', { n: model.free.length })}>
                      {'●'.repeat(Math.min(model.free.length, 4))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="shrink-0 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-2 py-1 text-[11px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-300" />{t('browse.legendBooked')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-300" />{t('browse.legendRequested')}</span>
        <span className="flex items-center gap-1"><span className="text-blue-400 text-xs">●●</span>{t('browse.legendFree')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-blue-500" />{t('browse.legendFrame')}</span>
      </div>

      <div className="shrink-0 px-1 pb-1">
        <div role="group" className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 text-sm font-semibold">
          <button type="button" onClick={() => setMode(false)} aria-pressed={!frameMode}
            className={`rounded-lg py-1.5 transition-colors ${!frameMode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            {t('browse.modeSingle')}
          </button>
          <button type="button" onClick={() => setMode(true)} aria-pressed={frameMode}
            className={`rounded-lg py-1.5 transition-colors ${frameMode ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}>
            {t('browse.modeFrame')}
          </button>
        </div>
        {frameMode && (
          <div className="mt-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
            <p className="text-xs text-blue-900">{t('browse.frameHint')}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-blue-900">{t('browse.frameSelected', { n: frameDays.length })}</span>
              <span className="flex gap-2">
                {frameDays.length > 0 && (
                  <button type="button" onClick={() => setFrameDays([])} className="text-sm text-blue-700 underline">{t('browse.frameClear')}</button>
                )}
                <button
                  type="button"
                  disabled={frameDays.length === 0}
                  onClick={() => setSheet({ days: frameDays, active: frameDays[0] })}
                  className="rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {t('browse.frameFind')}
                </button>
              </span>
            </div>
          </div>
        )}
      </div>

      {sheet && (
        <DaySheet
          days={sheet.days}
          active={sheet.active}
          model={buildDayModel(sheet.active, bookings, dayAvail)}
          todayStr={todayStr}
          hasLocation={hasLocation}
          locationError={locationError}
          location={location}
          cleanersById={cleanersById}
          frameId={frameMode ? frameId : undefined}
          onPick={(day) => setSheet({ days: sheet.days, active: day })}
          onClose={closeSheet}
          onRequestSent={() => router.refresh()}
        />
      )}
    </>
  )
}
