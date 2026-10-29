import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { countUnseen } from './seenItems'
import { fetchUnfinishedIds } from '@/lib/onboarding/unfinished'
import { Nav } from './Nav'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url')
    .eq('id', user.id)
    .single()

  // Defense in depth alongside middleware's role gate — a direct render path
  // that skipped middleware (or a future middleware change) shouldn't expose
  // admin data to a non-admin.
  if (profile?.role !== 'admin') redirect('/login')

  // Sidebar badges now show "unseen" counts (shared admin worklist, migration
  // 0024) rather than raw pending/unresolved totals — an item an admin has
  // already checked off stops contributing to the dot even while it's still
  // pending/unresolved. Each candidate set is fetched as bare ids (RLS only
  // lets a user read their own rows, so these site-wide reads need the
  // service-role client), then diffed against admin_seen_items.
  const admin = createAdminClient()
  const [
    { data: pendingCleanerApps },
    unfinished,
    { data: pendingCustomers },
    { data: pendingBookings },
    { data: matchedBookings },
    { data: openSupportMessages },
  ] = await Promise.all([
    admin.from('cleaner_applications').select('id, cleaner_id').eq('status', 'pending'),
    fetchUnfinishedIds(admin),
    admin.from('customers').select('id').eq('status', 'pending'),
    admin.from('bookings').select('id').eq('status', 'pending'),
    admin.from('bookings').select('id').in('status', ['accepted', 'completed']),
    admin.from('support_messages').select('id').eq('resolved', false),
  ])

  const [unseenCleanerApps, unseenCustomerApps, unseenBookingRequests, unseenMatches, unseenSupport] = await Promise.all([
    countUnseen('cleaner_application', (pendingCleanerApps ?? []).filter((r) => !unfinished.has(r.cleaner_id)).map((r) => r.id)),
    countUnseen('customer_application', (pendingCustomers ?? []).filter((r) => !unfinished.has(r.id)).map((r) => r.id)),
    countUnseen('booking', (pendingBookings ?? []).map((r) => r.id)),
    countUnseen('booking', (matchedBookings ?? []).map((r) => r.id)),
    countUnseen('support_message', (openSupportMessages ?? []).map((r) => r.id)),
  ])
  const pendingApplicationsCount = unseenCleanerApps + unseenCustomerApps

  return (
    <div className="min-h-screen bg-[#EFEFEF]">
      <Nav
        currentUserName={profile.full_name ?? user.email ?? ''}
        currentUserAvatarUrl={profile.avatar_url}
        openDisputesCount={unseenSupport}
        unmatchedRequestsCount={unseenBookingRequests}
        matchesCount={unseenMatches}
        pendingApplicationsCount={pendingApplicationsCount}
      />
      <main className="pt-14 md:ps-56">{children}</main>
    </div>
  )
}
