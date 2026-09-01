import { Nav } from '../Nav'
import { createAdminClient } from '@/lib/supabase/admin'
import { BookingsList } from './BookingsList'
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
    <div className="min-h-screen bg-[#EFEFEF] md:ps-56">
      <Nav />
      <div className="px-6 py-6">
        <BookingsList bookings={bookings} />
      </div>
    </div>
  )
}
