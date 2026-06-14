// PREVIEW MOCK — hardcoded as Sarah M. (id '1') for visual testing. Revert before merging.
'use client'
import { useEffect, useState } from 'react'
import { Nav } from './Nav'
import { CleanerBookingCard } from './CleanerBookingCard'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { MOCK_BOOKINGS } from '@/lib/mockData/bookings'
import { getAllBookings, updateBookingStatus } from '@/lib/mockBookingsStore'
import type { BookingResult } from '@/lib/types/booking'

const CLEANER_NAME = 'Sarah M.'

export default function CleanerDashboardPage() {
  const { t } = useLanguage()
  const [bookings, setBookings] = useState<BookingResult[]>(
    MOCK_BOOKINGS.filter(b => b.cleaner_name === CLEANER_NAME)
  )

  useEffect(() => {
    setBookings(getAllBookings().filter(b => b.cleaner_name === CLEANER_NAME))
  }, [])

  function handleUpdateStatus(id: string, status: 'accepted' | 'declined') {
    updateBookingStatus(id, status)
    setBookings(getAllBookings().filter(b => b.cleaner_name === CLEANER_NAME))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />

      <div className="px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">{t('dashboard.title')}</h1>

        {bookings.length === 0 && (
          <p className="text-gray-500 text-sm">{t('dashboard.empty')}</p>
        )}

        {bookings.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map(booking => (
              <CleanerBookingCard key={booking.id} booking={booking} onUpdateStatus={handleUpdateStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
