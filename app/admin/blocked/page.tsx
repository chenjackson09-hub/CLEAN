import { Nav } from '../Nav'
import { createAdminClient } from '@/lib/supabase/admin'
import { BlockedList, type BlockedUser } from './BlockedList'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function AdminBlockedPage() {
  noStore()
  const admin = createAdminClient()

  // The table may not exist yet (migration 0017 applied by hand) — degrade to an
  // empty list rather than throwing.
  const { data, error } = await admin
    .from('blocked_users')
    .select('id, name, email, phone, role, reason, blocked_at')
    .order('blocked_at', { ascending: false })
    .limit(500)

  const blocked: BlockedUser[] = (error ? [] : data ?? []).map(b => ({
    id: b.id,
    name: b.name ?? '',
    email: b.email ?? '',
    phone: b.phone ?? '',
    role: b.role ?? '',
    reason: b.reason ?? '',
    blocked_at: b.blocked_at ? new Date(b.blocked_at).toLocaleDateString() : '',
  }))

  return (
    <div className="min-h-screen bg-[#EFEFEF]">
      <Nav />
      <div className="px-6 py-6">
        <BlockedList blocked={blocked} />
      </div>
    </div>
  )
}
