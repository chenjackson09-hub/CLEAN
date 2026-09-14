'use client'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { BookingCard } from '@/app/(customer)/bookings/BookingCard'
import type { BookingResult } from '@/lib/types/booking'

type Props = {
  firstName: string
  today: BookingResult[]
  upcoming: BookingResult[]
  past: BookingResult[]
}

// Mirrors the cleaner dashboard's shape (a greeting, then Today/Upcoming/Past
// sections of actual bookings) rather than /home's old plain link-tile menu —
// the quick-links stay, just above the schedule instead of being the whole page.
export function HomeContent({ firstName, today, upcoming, past }: Props) {
  const { t } = useLanguage()

  return (
    <div className="max-w-xl -mx-1.5 sm:mx-auto pt-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('home.greeting', { name: firstName })}</h1>
      <p className="text-gray-500 mb-8">{t('home.subtitle')}</p>

      <div className="grid grid-cols-1 gap-4 mb-8">
        <Link
          href="/browse"
          className="flex items-center gap-4 bg-white rounded-2xl shadow-md hover:shadow-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{t('home.findCleaner')}</p>
            <p className="text-sm text-gray-500">{t('home.findCleanerBody')}</p>
          </div>
        </Link>

        <Link
          href="/bookings"
          className="flex items-center gap-4 bg-white rounded-2xl shadow-md hover:shadow-xl p-5 hover:shadow-md transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{t('home.myBookings')}</p>
            <p className="text-sm text-gray-500">{t('home.myBookingsBody')}</p>
          </div>
        </Link>

        <Link
          href="/profile"
          className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition-shadow"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{t('home.myProfile')}</p>
            <p className="text-sm text-gray-500">{t('home.myProfileBody')}</p>
          </div>
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('home.today')}</h2>
        {today.length > 0 ? (
          <div className="space-y-4">
            {today.map(b => <BookingCard key={b.id} booking={b} />)}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400 text-sm">
            {t('home.noToday')}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('home.upcoming')}</h2>
        {upcoming.length > 0 ? (
          <div className="space-y-4">
            {upcoming.map(b => <BookingCard key={b.id} booking={b} />)}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400 text-sm">
            {t('home.noUpcoming')}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('home.past')}</h2>
        {past.length > 0 ? (
          <div className="space-y-4">
            {past.map(b => <BookingCard key={b.id} booking={b} muted />)}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 py-8 text-center text-gray-400 text-sm">
            {t('home.noPast')}
          </div>
        )}
      </section>
    </div>
  )
}
