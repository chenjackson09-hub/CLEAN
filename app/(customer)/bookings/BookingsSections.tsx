'use client'
import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { BookingCard } from './BookingCard'
import { acknowledgeAllBookingsSeen } from '@/app/(customer)/actions'
import type { BookingResult } from '@/lib/types/booking'

// "Mark all as seen" for the Refused & cancelled list: dismisses every visible
// card at once. On success the page revalidates and the section drops out.
function MarkAllSeenButton({ ids }: { ids: string[] }) {
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  async function dismissAll() {
    setBusy(true)
    const res = await acknowledgeAllBookingsSeen(ids)
    if (res?.error) setBusy(false)
  }
  return (
    <div className="flex justify-end mb-4">
      <button
        type="button"
        onClick={dismissAll}
        disabled={busy}
        className="rounded-full bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 hover:bg-gray-700 transition disabled:opacity-50"
      >
        {busy ? t('bookingCard.markingSeen') : t('bookingCard.markAllSeen')}
      </button>
    </div>
  )
}

function Grid({ bookings, empty, muted = false, dismissible = false }: { bookings: BookingResult[]; empty: string; muted?: boolean; dismissible?: boolean }) {
  if (bookings.length === 0) {
    return <p className="text-gray-400 text-sm">{empty}</p>
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {bookings.map(b => <BookingCard key={b.id} booking={b} muted={muted} dismissible={dismissible} />)}
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

  // Only render sections that actually have bookings, so a customer with (say)
  // only past or only declined requests still sees their content instead of a
  // wall of "None" placeholders. Confirmed/Pending stay open by default; the
  // first non-empty section is always opened so something is visible even when
  // there's no confirmed booking. Refused/cancelled and past stay collapsed
  // otherwise (they can be long).
  const sections = [
    { key: 'confirmed', title: t('bookings.confirmed'), data: confirmed, badgeColor: 'bg-green-600', muted: false, dismissible: false, openByDefault: true },
    { key: 'pending', title: t('bookings.pendingRequests'), data: pending, badgeColor: 'bg-yellow-500', muted: false, dismissible: false, openByDefault: true },
    { key: 'inactive', title: t('bookings.refusedCancelled'), data: inactive, badgeColor: 'bg-gray-400', muted: true, dismissible: true, openByDefault: false },
    { key: 'past', title: t('bookings.pastCleans'), data: past, badgeColor: 'bg-gray-500', muted: true, dismissible: false, openByDefault: false },
  ].filter(s => s.data.length > 0)

  const firstKey = sections[0]?.key

  return (
    <div className="flex flex-col gap-8">
      {sections.map(s => (
        <CollapsibleSection
          key={s.key}
          title={s.title}
          count={s.data.length}
          badgeColor={s.badgeColor}
          defaultOpen={s.openByDefault || s.key === firstKey}
        >
          {s.key === 'inactive' && s.data.length > 1 && (
            <MarkAllSeenButton ids={s.data.map(b => b.id)} />
          )}
          <Grid bookings={s.data} empty="" muted={s.muted} dismissible={s.dismissible} />
        </CollapsibleSection>
      ))}
    </div>
  )
}
