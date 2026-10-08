'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { BookingRow } from './BookingRow'
import { BookingDetailModal } from './BookingDetailModal'
import { acknowledgeAllBookingsSeen } from '@/app/(customer)/actions'
import { splitBookings, groupByMonth } from '@/lib/bookingBuckets'
import { shortDateLabel } from '@/lib/dateLabels'
import { shortName } from '@/lib/chatFormat'
import type { BookingResult } from '@/lib/types/booking'

// A closed request is a single quiet line: who, when, and why it ended.
function ClosedLine({ booking }: { booking: BookingResult }) {
  const { t, lang } = useLanguage()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between gap-3 py-2 text-start text-sm text-gray-500 hover:text-gray-800"
      >
        <span className="truncate">
          {shortName(booking.cleaner_name)} · {shortDateLabel(booking.scheduled_date, lang === 'he' ? 'he' : 'en')}
        </span>
        <span className="shrink-0 text-xs text-gray-400">
          {booking.closed_reason ? t(`browse.closed_${booking.closed_reason}`) : t('bookings.tagClosed')}
        </span>
      </button>
      {open && <BookingDetailModal booking={booking} onClose={() => setOpen(false)} />}
    </>
  )
}

export function BookingsSections({ bookings, todayStr }: { bookings: BookingResult[]; todayStr: string }) {
  const { t, lang } = useLanguage()
  const { upcoming, history, closed } = splitBookings(bookings, todayStr)
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming')
  const [clearing, setClearing] = useState(false)
  const locale = lang === 'he' ? 'he-IL' : 'en-GB'

  async function clearClosed() {
    setClearing(true)
    const res = await acknowledgeAllBookingsSeen(closed.map(b => b.id))
    if (res?.error) setClearing(false)
  }

  const tabs = [
    { key: 'upcoming' as const, title: t('bookings.upcomingTab'), count: upcoming.length },
    { key: 'history' as const, title: t('bookings.historyTab'), count: 0 },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="mx-auto w-fit flex items-center gap-1 bg-gray-100 rounded-xl p-1.5">
        {tabs.map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => setTab(s.key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-5 py-2 text-sm font-semibold transition ${
              tab === s.key ? 'bg-blue-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.title}
            {s.count > 0 && (
              <span className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold rounded-full ${tab === s.key ? 'bg-white/20 text-white' : 'bg-green-600 text-white'}`}>
                {s.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'upcoming' && (
        upcoming.length === 0 ? (
          <p className="text-center text-sm text-gray-400">{t('bookings.noneUpcoming')}</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map(b => <BookingRow key={b.id} booking={b} todayStr={todayStr} />)}
          </div>
        )
      )}

      {tab === 'history' && (
        <div className="space-y-6">
          {history.length === 0 && closed.length === 0 && (
            <p className="text-center text-sm text-gray-400">{t('bookings.noneHistory')}</p>
          )}
          {groupByMonth(history).map(group => (
            <section key={group.month}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                {new Date(`${group.month}-01T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
              </h2>
              <div className="space-y-3">
                {group.items.map(b => <BookingRow key={b.id} booking={b} todayStr={todayStr} />)}
              </div>
            </section>
          ))}
          {closed.length > 0 && (
            <details className="rounded-2xl bg-white/60 px-4 py-2">
              <summary className="cursor-pointer select-none py-1 text-sm font-semibold text-gray-500">
                {t('bookings.closedTitle', { n: String(closed.length) })}
              </summary>
              <div className="divide-y divide-gray-100">
                {closed.map(b => <ClosedLine key={b.id} booking={b} />)}
              </div>
              <button
                type="button"
                onClick={clearClosed}
                disabled={clearing}
                className="mt-1 mb-1 text-xs font-semibold text-gray-400 hover:text-gray-700 disabled:opacity-50"
              >
                {clearing ? t('bookingCard.markingSeen') : t('bookings.closedClear')}
              </button>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
