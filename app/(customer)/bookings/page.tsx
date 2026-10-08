import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from 'next/link'
import { BookingsSections } from './BookingsSections'
import { MarkBookingsSeen } from './MarkBookingsSeen'
import { fetchCustomerBookingResults } from '@/lib/customerBookings'

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const bookings = await fetchCustomerBookingResults(user.id)
  const todayStr = ymd(new Date())

  return (
    <div className="max-w-3xl mx-auto">
      <MarkBookingsSeen />
      <h1 className="text-xl font-bold text-gray-900 mb-6">My Bookings</h1>

      {bookings.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No bookings yet.{' '}
          <Link href="/browse" className="text-blue-600 font-semibold hover:underline">
            Go to Schedule
          </Link>{' '}
          to make your first booking.
        </p>
      ) : (
        <BookingsSections bookings={bookings} todayStr={todayStr} />
      )}
    </div>
  )
}
