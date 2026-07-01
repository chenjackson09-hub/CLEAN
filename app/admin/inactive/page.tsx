import { Nav } from '../Nav'
import { createAdminClient } from '@/lib/supabase/admin'
import { InactiveList, type InactiveUser } from './InactiveList'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

const MONTH_MS = 30 * 24 * 60 * 60 * 1000

export default async function AdminInactivePage() {
  noStore()
  const admin = createAdminClient()
  const cutoff = Date.now() - MONTH_MS

  const [authData, { data: profileRows }, { data: bookingRows }] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from('profiles').select('id, full_name, phone, role'),
    admin.from('bookings').select('customer_id, created_at'),
  ])

  const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))

  // Most recent booking ("request") per customer.
  const lastRequest = new Map<string, string>()
  for (const b of bookingRows ?? []) {
    if (!b.customer_id || !b.created_at) continue
    const prev = lastRequest.get(b.customer_id)
    if (!prev || new Date(b.created_at) > new Date(prev)) lastRequest.set(b.customer_id, b.created_at)
  }

  const noLogin: InactiveUser[] = []
  const noRequests: InactiveUser[] = []

  for (const u of authData.data?.users ?? []) {
    const profile = profileMap.get(u.id)
    const role = profile?.role ?? ''
    if (role === 'admin') continue // don't flag admins

    const base = {
      id: u.id,
      name: profile?.full_name ?? '',
      email: u.email ?? '',
      phone: profile?.phone ?? '',
      role,
    }

    // "Hasn't logged in for a month" — fall back to account age so brand-new
    // users who never signed in aren't flagged prematurely.
    const lastLogin = u.last_sign_in_at ?? null
    const loginRef = lastLogin ?? u.created_at
    if (loginRef && new Date(loginRef).getTime() < cutoff) {
      noLogin.push({ ...base, date: lastLogin })
    }

    // "Hasn't sent a request for a month" — customers only (they're the ones who
    // send booking requests). Fall back to account age when they never booked.
    if (role === 'customer') {
      const lastReq = lastRequest.get(u.id) ?? null
      const reqRef = lastReq ?? u.created_at
      if (reqRef && new Date(reqRef).getTime() < cutoff) {
        noRequests.push({ ...base, date: lastReq })
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#EFEFEF]">
      <Nav />
      <div className="px-6 py-6">
        <InactiveList noLogin={noLogin} noRequests={noRequests} />
      </div>
    </div>
  )
}
