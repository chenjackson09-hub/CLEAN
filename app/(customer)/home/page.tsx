import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { fetchCustomerBookingResults } from '@/lib/customerBookings'
import { daysBetween } from '@/lib/dateMath'
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

  // Confirmed / Pending / Past cleans, matching the stakeholder mockup —
  // replaces the old Today/Upcoming/Past split (Today and Upcoming merge
  // into one Confirmed section with an inline "today"/"in N days" countdown
  // per row instead of a separate section).
  const todayStr = ymd(new Date())
  const confirmed = bookings
    .filter(b => b.status === 'accepted' && b.scheduled_date >= todayStr)
    .sort((a, b) => a.scheduled_date === b.scheduled_date ? a.scheduled_start.localeCompare(b.scheduled_start) : a.scheduled_date.localeCompare(b.scheduled_date))
    .slice(0, 10)
  const pending = bookings
    .filter(b => b.status === 'pending')
    .sort((a, b) => a.scheduled_date === b.scheduled_date ? a.scheduled_start.localeCompare(b.scheduled_start) : a.scheduled_date.localeCompare(b.scheduled_date))
    .slice(0, 10)
    .map(b => ({
      ...b,
      // created_at is a full ISO timestamp; its first 10 characters are
      // already YYYY-MM-DD, so no Date parsing (and no timezone ambiguity)
      // is needed to get "how many days ago was this requested".
      daysAgo: daysBetween(b.created_at?.slice(0, 10) ?? todayStr, todayStr),
    }))
  const past = bookings
    .filter(b => b.status === 'completed')
    .sort((a, b) => b.scheduled_date === a.scheduled_date ? b.scheduled_start.localeCompare(a.scheduled_start) : b.scheduled_date.localeCompare(a.scheduled_date))
    .slice(0, 20)

  return <HomeContent firstName={firstName} todayStr={todayStr} confirmed={confirmed} pending={pending} past={past} />
}
