// PREVIEW MOCK — remove auth + inject fake data for visual testing. Revert before merging.
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Nav } from '../Nav'
import { BookingCard } from './BookingCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { MOCK_BOOKINGS } from '@/lib/mockData/bookings'
import { getAllBookings } from '@/lib/mockBookingsStore'
import type { BookingResult } from '@/lib/types/booking'

export default function BookingsPage() {
  const { t } = useLanguage()
  const [bookings, setBookings] = useState<BookingResult[]>(MOCK_BOOKINGS)

  useEffect(() => {
    setBookings(getAllBookings())
  }, [])

  const error = null

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />

      <div className="px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{t('bookings.title')}</h1>

        {error && (
          <p className="text-red-600 text-sm">{t('bookings.error')}</p>
        )}

        {!error && bookings.length === 0 && (
          <p className="text-gray-500 text-sm">
            {t('bookings.empty')}{' '}
            <Link href="/browse" className="text-indigo-600 font-semibold hover:underline">
              {t('bookings.browseCleaners')}
            </Link>{' '}
            {t('bookings.toFindFirst')}
          </p>
        )}

        {bookings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map(b => <BookingCard key={b.id} booking={b} />)}
          </div>
        )}
      </div>
    </div>
  )
}
