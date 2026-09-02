import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'
import { AdminsList, type AdminAccount, type PendingInvite } from './AdminsList'
import { isInactiveSince } from '@/lib/adminUserStatus'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function AdminAdminsPage() {
  noStore()
  const admin = createAdminClient()
  const currentUser = await getCurrentUser()

  // admin_invites may not exist yet (migration 0021 applied by hand) — degrade
  // to an empty list rather than throwing.
  const [{ data: profileRows }, authData, inviteRes] = await Promise.all([
    admin.from('profiles').select('id, full_name').eq('role', 'admin').order('full_name'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin
      .from('admin_invites')
      .select('id, token, created_at, expires_at, used_at')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ])

  const authMap = new Map((authData.data?.users ?? []).map((u) => [u.id, u]))

  const admins: AdminAccount[] = (profileRows ?? []).map((p) => {
    const authUser = authMap.get(p.id)
    return {
      id: p.id,
      full_name: p.full_name ?? '',
      email: authUser?.email ?? '',
      isYou: p.id === currentUser?.id,
      // No "blocked" concept for admins — deleting one deletes the account
      // outright, there's no soft-suspend/snapshot state to represent here.
      userStatus: isInactiveSince(authUser?.last_sign_in_at ?? null, authUser?.created_at ?? new Date().toISOString())
        ? 'inactive'
        : 'active',
    }
  })

  const invites: PendingInvite[] = (inviteRes.error ? [] : inviteRes.data ?? []).map((i) => ({
    id: i.id,
    token: i.token,
    created_at: i.created_at,
    expires_at: i.expires_at,
  }))

  return (
      <div className="px-6 py-6">
        <AdminsList admins={admins} invites={invites} />
      </div>
  )
}
