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

  // Only render tabs that actually have bookings, so a customer with (say) only
  // past or only declined requests still sees their content instead of empty
  // tabs. Order prioritises confirmed → pending → refused/cancelled → past; the
  // first non-empty tab is selected on load so something is always visible.
  const sections = [
    { key: 'confirmed', title: t('bookings.confirmed'), data: confirmed, badgeColor: 'bg-green-600', muted: false, dismissible: false },
    { key: 'pending', title: t('bookings.pendingRequests'), data: pending, badgeColor: 'bg-yellow-500', muted: false, dismissible: false },
    { key: 'inactive', title: t('bookings.refusedCancelled'), data: inactive, badgeColor: 'bg-gray-400', muted: true, dismissible: true },
    { key: 'past', title: t('bookings.pastCleans'), data: past, badgeColor: 'bg-gray-500', muted: true, dismissible: false },
  ].filter(s => s.data.length > 0)

  // Which tab is selected. Seeded with the first non-empty category (see the
  // ordering above) so something is always shown on first render.
  const [active, setActive] = useState(sections[0]?.key)

  // Resolve the selected tab against the *current* section list. `active` can
  // point at a tab that just emptied out — e.g. the customer dismissed the last
  // refused booking, so 'inactive' is no longer in `sections` after the page
  // revalidates — in which case we fall back to the first available tab rather
  // than render nothing.
  const current = sections.find(s => s.key === active) ?? sections[0]

  // No bookings in any category at all → render nothing (the page shows its own
  // empty state around this component).
  if (!current) return null

  return (
    <div className="flex flex-col gap-6">
      {/* Top tab bar: one pill button per non-empty category, replacing the old
          collapsible accordion sections. Scrolls sideways on narrow screens so
          all tabs stay reachable without wrapping. */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 bg-gray-100">
        {sections.map(s => {
          const selected = s.key === current.key
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(s.key)}
              // Selected tab = solid dark pill; others = outlined white pills.
              className={`flex items-center gap-2 whitespace-nowrap rounded-md px-2 py-2 text-sm font-semibold transition ${
                selected
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {s.title}
              {/* Count badge: keeps the per-category color when unselected, but
                  goes translucent-white on the dark selected pill for contrast. */}
              <span
                className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-bold rounded-full ${
                  selected ? 'bg-white/20 text-white' : `${s.badgeColor} text-white`
                }`}
              >
                {s.data.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Body: only the selected category's cards. The "mark all as seen" bulk
          action is specific to the refused/cancelled ('inactive') tab and only
          worth showing when there's more than one card to clear. */}
      <div>
        {current.key === 'inactive' && current.data.length > 1 && (
          <MarkAllSeenButton ids={current.data.map(b => b.id)} />
        )}
        <Grid bookings={current.data} empty="" muted={current.muted} dismissible={current.dismissible} />
      </div>
    </div>
  )
}
