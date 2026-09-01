import { createAdminClient } from '@/lib/supabase/admin'
import { CustomersList } from './CustomersList'
import type { CustomerResult } from '@/lib/types/customer'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function AdminCustomersPage() {
  noStore()
  const admin = createAdminClient()

  const [{ data: customerRows }, { data: profileRows }, authData] = await Promise.all([
    admin.from('customers').select('id, address, rating_avg, rating_count').limit(500),
    admin.from('profiles').select('id, full_name, phone').eq('role', 'customer').limit(500),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))
  const emailMap = new Map((authData.data?.users ?? []).map(u => [u.id, u.email ?? '']))

  const customers = (customerRows ?? []).map(c => {
    const profile = profileMap.get(c.id)
    return {
      id: c.id,
      full_name: profile?.full_name ?? '',
      email: emailMap.get(c.id) ?? '',
      phone: profile?.phone ?? '',
      address: c.address ?? '',
      rating_avg: (c as { rating_avg?: number | null }).rating_avg ?? null,
      rating_count: (c as { rating_count?: number }).rating_count ?? 0,
      adminNotes: '',
    } satisfies CustomerResult & { adminNotes: string }
  })

  return (
      <div className="px-6 py-6">
        <CustomersList customers={customers} />
      </div>
  )
}
