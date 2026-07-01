import { Nav } from '../Nav'
import { createAdminClient } from '@/lib/supabase/admin'
import { SupportList, type SupportMessage } from './SupportList'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function AdminSupportPage() {
  noStore()
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('support_messages')
    .select('id, user_id, user_role, message, resolved, created_at')
    .order('created_at', { ascending: false })
    .limit(500)

  const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)))
  const { data: profileRows } = userIds.length
    ? await admin.from('profiles').select('id, full_name, phone').in('id', userIds)
    : { data: [] as { id: string; full_name: string | null; phone: string | null }[] }

  const profileMap = new Map((profileRows ?? []).map((p) => [p.id, p]))

  const messages: SupportMessage[] = (rows ?? []).map((r) => {
    const profile = profileMap.get(r.user_id)
    return {
      id: r.id,
      userRole: r.user_role,
      name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      message: r.message,
      resolved: r.resolved,
      createdAt: r.created_at,
    }
  })

  return (
    <div className="min-h-screen bg-[#EFEFEF]">
      <Nav />
      <div className="px-6 py-6">
        <SupportList messages={messages} />
      </div>
    </div>
  )
}
