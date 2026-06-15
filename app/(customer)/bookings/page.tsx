import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from 'next/link'
import { BookingCard } from './BookingCard'

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: rawBookings } = await supabase
    .from("bookings")
    .select("id, service_type, scheduled_date, scheduled_start, duration_hours, address, notes, status, cleaner_id")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })

  const cleanerIds = Array.from(new Set((rawBookings ?? []).map(b => b.cleaner_id)))

  const { data: cleanerProfiles } = cleanerIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, avatar_url, phone").in("id", cleanerIds)
    : { data: [] }

  const profileMap = Object.fromEntries((cleanerProfiles ?? []).map(p => [p.id, p]))

  const bookings = (rawBookings ?? []).map(b => {
    const cleaner = profileMap[b.cleaner_id]
    return {
      id: b.id,
      cleaner_name: cleaner?.full_name ?? 'Cleaner',
      cleaner_avatar_url: cleaner?.avatar_url ?? null,
      cleaner_phone: cleaner?.phone ?? undefined,
      service_type: b.service_type as 'residential' | 'commercial',
      scheduled_date: b.scheduled_date,
      scheduled_start: b.scheduled_start,
      duration_hours: b.duration_hours,
      address: b.address,
      notes: b.notes ?? undefined,
      status: b.status as 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled',
    }
  })

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Bookings</h1>

      {bookings.length === 0 && (
        <p className="text-gray-500 text-sm">
          No bookings yet.{' '}
          <Link href="/browse" className="text-blue-600 font-semibold hover:underline">
            Browse cleaners
          </Link>{' '}
          to make your first booking.
        </p>
      )}

      {bookings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bookings.map(b => <BookingCard key={b.id} booking={b} />)}
        </div>
      )}
    </div>
  )
}
