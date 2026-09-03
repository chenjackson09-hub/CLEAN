import { redirect } from 'next/navigation'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Nav } from './Nav'

const UNMATCHED_STALE_MS = 2 * 60 * 60 * 1000

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

  // Sidebar badge counts — RLS only lets a user read their own rows, so these
  // site-wide counts need the service-role client (same as every other admin
  // page). Kept intentionally cheap (count-only, head:true).
  const admin = createAdminClient()
  const staleCutoff = new Date(Date.now() - UNMATCHED_STALE_MS).toISOString()
  const [
    { count: openDisputesCount },
    { count: unmatchedRequestsCount },
    { count: pendingCleanerAppsCount },
    { count: pendingCustomersCount },
  ] = await Promise.all([
    admin.from('support_messages').select('id', { count: 'exact', head: true }).eq('resolved', false),
    admin.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending').lt('created_at', staleCutoff),
    admin.from('cleaner_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    // Combined with pending cleaner applications below so this badge matches
    // the unified "All Applications" list (migration 0023). `count` naturally
    // falls back to 0 via `?? 0` if the column isn't readable yet, same as
    // every other count here.
    admin.from('customers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ])
  const pendingApplicationsCount = (pendingCleanerAppsCount ?? 0) + (pendingCustomersCount ?? 0)

  return (
    <div className="min-h-screen bg-[#EFEFEF]">
      <Nav
        currentUserName={profile.full_name ?? user.email ?? ''}
        currentUserAvatarUrl={profile.avatar_url}
        openDisputesCount={openDisputesCount ?? 0}
        unmatchedRequestsCount={unmatchedRequestsCount ?? 0}
        pendingApplicationsCount={pendingApplicationsCount ?? 0}
      />
      <main className="pt-14 md:ps-56">{children}</main>
    </div>
  )
}
