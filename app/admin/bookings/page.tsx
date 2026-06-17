import { Nav } from '../Nav'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookingReviewCard } from './BookingReviewCard'
import type { BookingResult } from '@/lib/types/booking'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function AdminBookingsPage() {
  noStore()
  const admin = createAdminClient()

  const { data: bookingRows } = await admin
    .from('bookings')
    .select('id, cleaner_id, customer_id, service_type, scheduled_date, scheduled_start, duration_hours, address, notes, status')
    .order('scheduled_date', { ascending: false })
    .limit(500)

  const allIds = Array.from(new Set([
    ...(bookingRows ?? []).map(b => b.cleaner_id),
    ...(bookingRows ?? []).map(b => b.customer_id),
  ]))

  const { data: profileRows } = allIds.length > 0
    ? await admin.from('profiles').select('id, full_name, avatar_url').in('id', allIds)
    : { data: [] }

  const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))

  const bookings: BookingResult[] = (bookingRows ?? []).map(b => ({
    id: b.id,
    cleaner_name: profileMap.get(b.cleaner_id)?.full_name ?? 'Cleaner',
    cleaner_avatar_url: profileMap.get(b.cleaner_id)?.avatar_url ?? null,
    customer_name: profileMap.get(b.customer_id)?.full_name ?? 'Customer',
    service_type: b.service_type as BookingResult['service_type'],
    scheduled_date: b.scheduled_date,
    scheduled_start: b.scheduled_start.slice(0, 5),
    duration_hours: b.duration_hours,
    address: b.address,
    notes: b.notes ?? undefined,
    status: b.status as BookingResult['status'],
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />
      <div className="px-6 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">All Bookings</h1>
        {bookings.length === 0 ? (
          <p className="text-gray-500 text-sm">No bookings yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map(booking => (
              <BookingReviewCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
