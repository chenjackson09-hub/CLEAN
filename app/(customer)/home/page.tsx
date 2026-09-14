import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { fetchCustomerBookingResults } from '@/lib/customerBookings'
import { HomeContent } from './HomeContent'

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function CustomerHomePage() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()])

  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    : { data: null }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  const bookings = user ? await fetchCustomerBookingResults(user.id) : []

  // Mirrors the cleaner dashboard's Upcoming/Past split (accepted + completed
  // only — pending/declined/cancelled requests stay on /bookings), with
  // "today" broken out as its own section rather than a per-card countdown.
  const todayStr = ymd(new Date())
  const accepted = bookings.filter(b => b.status === 'accepted')
  const today = accepted
    .filter(b => b.scheduled_date === todayStr)
    .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start))
  const upcoming = accepted
    .filter(b => b.scheduled_date > todayStr)
    .sort((a, b) => a.scheduled_date === b.scheduled_date ? a.scheduled_start.localeCompare(b.scheduled_start) : a.scheduled_date.localeCompare(b.scheduled_date))
    .slice(0, 6)
  const past = bookings
    .filter(b => b.status === 'completed')
    .sort((a, b) => b.scheduled_date === a.scheduled_date ? b.scheduled_start.localeCompare(a.scheduled_start) : b.scheduled_date.localeCompare(a.scheduled_date))
    .slice(0, 20)

  return <HomeContent firstName={firstName} today={today} upcoming={upcoming} past={past} />
}
