'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { BookingCard } from './BookingCard'
import type { BookingResult } from '@/lib/types/booking'

function Grid({ bookings, empty, muted = false }: { bookings: BookingResult[]; empty: string; muted?: boolean }) {
  if (bookings.length === 0) {
    return <p className="text-gray-400 text-sm">{empty}</p>
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {bookings.map(b => <BookingCard key={b.id} booking={b} muted={muted} />)}
    </div>
  )
}

function CollapsibleSection({
  title,
  count,
  badgeColor,
  defaultOpen,
  children,
}: {
  title: string
  count: number
  badgeColor: string
  defaultOpen: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 bg-white rounded-3xl px-4 py-3 shadow-sm border border-gray-100"
      >
        <span className="flex items-center gap-2 text-lg font-bold text-gray-900">
          {count > 0 && (
            <span className={`min-w-[22px] h-[22px] px-1.5 flex items-center justify-center text-xs font-bold text-white rounded-full ${badgeColor}`}>
              {count}
            </span>
          )}
          {title}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  )
}

export function BookingsSections({
  confirmed,
  pending,
  inactive,
  past,
}: {
  confirmed: BookingResult[]
  pending: BookingResult[]
  inactive: BookingResult[]
  past: BookingResult[]
}) {
  const { t } = useLanguage()

  return (
    <div className="flex flex-col gap-8">
      {/* Upcoming (accepted) — open by default */}
      <CollapsibleSection
        title={t('bookings.confirmed')}
        count={confirmed.length}
        badgeColor="bg-green-600"
        defaultOpen
      >
        <Grid bookings={confirmed} empty={t('bookings.noneConfirmed')} />
      </CollapsibleSection>

      {/* Pending — open by default when there's something to see */}
      <CollapsibleSection
        title={t('bookings.pendingRequests')}
        count={pending.length}
        badgeColor="bg-yellow-500"
        defaultOpen={pending.length > 0}
      >
        <Grid bookings={pending} empty={t('bookings.nonePending')} />
      </CollapsibleSection>

      {/* Refused & cancelled (most recent 20 combined) — declined/expired
          requests, siblings auto-cancelled when another cleaner was booked, and
          bookings the customer cancelled. Collapsed. */}
      <CollapsibleSection
        title={t('bookings.refusedCancelled')}
        count={inactive.length}
        badgeColor="bg-gray-400"
        defaultOpen={false}
      >
        <Grid bookings={inactive} empty={t('bookings.noneRefusedCancelled')} muted />
      </CollapsibleSection>

      {/* Past cleans — collapsed by default, dimmed cards */}
      <CollapsibleSection
        title={t('bookings.pastCleans')}
        count={past.length}
        badgeColor="bg-gray-500"
        defaultOpen={false}
      >
        <Grid bookings={past} empty={t('bookings.nonePast')} muted />
      </CollapsibleSection>
    </div>
  )
}
