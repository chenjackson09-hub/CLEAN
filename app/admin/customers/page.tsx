import { Nav } from '../Nav'
import { createAdminClient } from '@/lib/supabase/admin'
import { CustomersList } from './CustomersList'
import type { CustomerResult } from '@/lib/types/customer'

export default async function AdminCustomersPage() {
  const admin = createAdminClient()

  const [{ data: customerRows }, { data: profileRows }, authData] = await Promise.all([
    admin.from('customers').select('id, address'),
    admin.from('profiles').select('id, full_name, phone').eq('role', 'customer'),
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
      adminNotes: '',
    } satisfies CustomerResult & { adminNotes: string }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <Nav />
      <div className="px-6 py-6">
        <CustomersList customers={customers} />
      </div>
    </div>
  )
}
