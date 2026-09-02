import { createAdminClient } from '@/lib/supabase/admin'
import { CustomersList } from './CustomersList'
import type { CustomerResult } from '@/lib/types/customer'
import { classifyUserStatus, type UserStatus } from '@/lib/adminUserStatus'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage() {
  noStore()
  const admin = createAdminClient()

  // Deleted customers are hard-deleted (unlike cleaners' soft-suspend) — the
  // only trace left is their blocked_users snapshot. So "Blocked" for
  // customers isn't a filter on this query, it's a second, separate source
  // merged in below as read-only phantom rows (no live account backs them).
  const [{ data: customerRows }, { data: profileRows }, authData, { data: blockedRows }] = await Promise.all([
    admin.from('customers').select('id, address, rating_avg, rating_count').limit(500),
    admin.from('profiles').select('id, full_name, phone').eq('role', 'customer').limit(500),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('blocked_users').select('id, name, email, phone').eq('role', 'customer').limit(500),
  ])

  const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))
  const authMap = new Map((authData.data?.users ?? []).map(u => [u.id, u]))

  const customers = (customerRows ?? []).map(c => {
    const profile = profileMap.get(c.id)
    const authUser = authMap.get(c.id)
    const userStatus: UserStatus = classifyUserStatus({
      isBlocked: false, // a live row here means the account exists — not blocked
      lastSignInAt: authUser?.last_sign_in_at ?? null,
      createdAt: authUser?.created_at ?? new Date().toISOString(),
    })
    return {
      id: c.id,
      full_name: profile?.full_name ?? '',
      email: authUser?.email ?? '',
      phone: profile?.phone ?? '',
      address: c.address ?? '',
      rating_avg: (c as { rating_avg?: number | null }).rating_avg ?? null,
      rating_count: (c as { rating_count?: number }).rating_count ?? 0,
      adminNotes: '',
      userStatus,
      isPhantomBlocked: false,
    } satisfies CustomerResult & { adminNotes: string; userStatus: UserStatus; isPhantomBlocked: boolean }
  })

  const blockedPhantoms = (blockedRows ?? []).map(b => ({
    id: `blocked-${b.id}`,
    full_name: b.name ?? '',
    email: b.email ?? '',
    phone: b.phone ?? '',
    address: '',
    rating_avg: null,
    rating_count: 0,
    adminNotes: '',
    userStatus: 'blocked' as UserStatus,
    isPhantomBlocked: true,
  } satisfies CustomerResult & { adminNotes: string; userStatus: UserStatus; isPhantomBlocked: boolean }))

  return (
      <div className="px-6 py-6">
        <CustomersList customers={[...customers, ...blockedPhantoms]} />
      </div>
  )
}
