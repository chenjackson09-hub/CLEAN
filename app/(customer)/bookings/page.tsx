import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from 'next/link'
import { BookingsSections } from './BookingsSections'
import { MarkBookingsSeen } from './MarkBookingsSeen'
import { fetchCustomerBookingResults } from '@/lib/customerBookings'

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const bookings = await fetchCustomerBookingResults(user.id)

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
  // Once the customer marks one as seen it drops off the list.
  const inactive = bookings
    .filter(b => (b.status === 'declined' || b.status === 'cancelled') && !b.customer_ack_inactive)
    .slice(0, 20)
  const past = bookings.filter(b => b.status === 'completed')

  return (
    <div className="max-w-3xl mx-auto">
      <MarkBookingsSeen />
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Bookings</h1>

      {confirmed.length + pending.length + inactive.length + past.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No bookings yet.{' '}
          <Link href="/browse" className="text-blue-600 font-semibold hover:underline">
            Go to Schedule
          </Link>{' '}
          to make your first booking.
        </p>
      ) : (
        <BookingsSections confirmed={confirmed} pending={pending} inactive={inactive} past={past} />
      )}
    </div>
  )
}
