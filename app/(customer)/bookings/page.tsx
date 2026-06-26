import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import Link from 'next/link'
import { BookingsSections } from './BookingsSections'
import { MarkBookingsSeen } from './MarkBookingsSeen'

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: rawBookings } = await supabase
    .from("bookings")
    .select("id, service_type, scheduled_date, scheduled_start, duration_hours, address, notes, status, response_deadline, cleaner_id, cleaner_modified")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })

  const now = Date.now()

  const cleanerIds = Array.from(new Set((rawBookings ?? []).map(b => b.cleaner_id)))

  // Read cleaner profiles with the service-role client: RLS prevents a customer's
  // session from reading other users' `profiles` rows, so the session client would
  // return nothing and every booking would fall back to the literal "Cleaner".
  // (Browse and the cleaner-detail page use the admin client for the same reason.)
  const admin = createAdminClient()
  const { data: cleanerProfiles } = cleanerIds.length > 0
    ? await admin.from("profiles").select("id, full_name, avatar_url, phone").in("id", cleanerIds)
    : { data: [] }

  const profileMap = Object.fromEntries((cleanerProfiles ?? []).map(p => [p.id, p]))

  const bookings = (rawBookings ?? []).map(b => {
    const cleaner = profileMap[b.cleaner_id]
    // A pending request past its 24h response deadline is effectively declined —
    // surface that to the customer instead of leaving it "pending" forever.
    // (The DB row is still 'pending' until a cleaner page load runs
    // lib/expireRequests.ts and writes 'declined'; this just mirrors that early.)
    const expired = b.status === 'pending' && new Date(b.response_deadline).getTime() < now
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
      status: (expired ? 'declined' : b.status) as 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled',
      cleaner_modified: b.cleaner_modified ?? false,
    }
  })

  // Five buckets, split purely by status: confirmed (accepted) up top, pending
  // requests, "Refused requests" (declined — the cleaner said no, or a request
  // expired with no response), "Cancelled" (the request was called off: the
  // customer pressed Cancel, or a sibling was auto-cancelled when another cleaner
  // was booked), and past cleans (completed only). The refused/cancelled lists are
  // capped at the 20 most recent (bookings are already ordered newest-first).
  const confirmed = bookings.filter(b => b.status === 'accepted')
  const pending = bookings.filter(b => b.status === 'pending')
  // Refused (declined/expired) and cancelled requests share one collapsed
  // section; combined and capped at the 20 most recent (already newest-first).
  const inactive = bookings.filter(b => b.status === 'declined' || b.status === 'cancelled').slice(0, 20)
  const past = bookings.filter(b => b.status === 'completed')

  return (
    <div className="max-w-3xl mx-auto">
      <MarkBookingsSeen />
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Bookings</h1>

      {bookings.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No bookings yet.{' '}
          <Link href="/browse" className="text-blue-600 font-semibold hover:underline">
            Browse cleaners
          </Link>{' '}
          to make your first booking.
        </p>
      ) : (
        <BookingsSections confirmed={confirmed} pending={pending} inactive={inactive} past={past} />
      )}
    </div>
  )
}
