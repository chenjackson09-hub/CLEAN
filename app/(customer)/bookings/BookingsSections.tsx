'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { BookingCard } from './BookingCard'
import type { BookingResult } from '@/lib/types/booking'

function Grid({ bookings, empty }: { bookings: BookingResult[]; empty: string }) {
  if (bookings.length === 0) {
    return <p className="text-gray-400 text-sm">{empty}</p>
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {bookings.map(b => <BookingCard key={b.id} booking={b} />)}
    </div>
  )
}

export function BookingsSections({
  confirmed,
  pending,
  past,
}: {
  confirmed: BookingResult[]
  pending: BookingResult[]
  past: BookingResult[]
}) {
  const { t } = useLanguage()
  // Pending can be long, so it collapses; open by default when there's something to see.
  const [pendingOpen, setPendingOpen] = useState(pending.length > 0)

  return (
    <div className="flex flex-col gap-8">
      {/* Confirmed */}
      <section className="bg-white rounded-3xl shadow-md p-5">
        <h2 className=" p-2 text-lg font-bold text-gray-900 mb-3">
          {t('bookings.confirmed')}
          {confirmed.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">({confirmed.length})</span>
          )}
        </h2>
        <Grid bookings={confirmed} empty={t('bookings.noneConfirmed')} />
      </section>

      {/* Pending — collapsible dropdown card */}
      <section>
        <button
          type="button"
          onClick={() => setPendingOpen(o => !o)}
          className="w-full flex items-center justify-between gap-3 bg-white rounded-3xl px-4 py-3 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2 text-lg font-bold text-gray-900">
            {t('bookings.pendingRequests')}
            {pending.length > 0 && (
              <span className="min-w-[22px] h-[22px] px-1.5 flex items-center justify-center text-xs font-bold text-white bg-yellow-500 rounded-full">
                {pending.length}
              </span>
            )}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-5 h-5 text-gray-400 transition-transform ${pendingOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {pendingOpen && (
          <div className="mt-4">
            <Grid bookings={pending} empty={t('bookings.nonePending')} />
          </div>
        )}
      </section>

      {/* Past cleans */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          {t('bookings.pastCleans')}
          {past.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">({past.length})</span>
          )}
        </h2>
        <Grid bookings={past} empty={t('bookings.nonePast')} />
      </section>
    </div>
  )
}
