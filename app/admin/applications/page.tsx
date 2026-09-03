import { createAdminClient } from '@/lib/supabase/admin'
import { ApplicationsList } from './ApplicationsList'
import type { UnifiedApplication } from '@/lib/types/application'

// Reads live admin data (listUsers); render on demand like the other admin pages.
export const dynamic = 'force-dynamic'

export default async function ApplicationsPage() {
  const admin = createAdminClient()

  const [{ data: appRows }, { data: cleanerRows }, { data: customerRows }, { data: profileRows }, authData] = await Promise.all([
    admin.from('cleaner_applications').select('id, status, submitted_at, reviewed_at, cleaner_id, id_document_url, admin_notes').order('submitted_at', { ascending: false }),
    admin.from('cleaners').select('id, bio, service_types, hourly_rate, years_experience, languages, address, cleans_completed'),
    // Customers have no separate "applications" table — their own row IS the
    // review record (status/status_reviewed_at, migration 0023).
    admin.from('customers').select('id, address, status, status_reviewed_at, admin_notes'),
    admin.from('profiles').select('id, full_name, phone, avatar_url'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const cleanerMap = new Map((cleanerRows ?? []).map(c => [c.id, c]))
  const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))
  const authUsers = authData.data?.users ?? []
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? '']))
  const createdAtMap = new Map(authUsers.map(u => [u.id, u.created_at]))

  const cleanerApplications: (UnifiedApplication & { sortKey: string })[] = (appRows ?? []).map(row => {
    const cleaner = cleanerMap.get(row.cleaner_id)
    const profile = profileMap.get(row.cleaner_id)
    return {
      id: row.id,
      category: 'cleaner',
      personId: row.cleaner_id,
      full_name: profile?.full_name ?? '',
      avatar_url: profile?.avatar_url ?? null,
      email: emailMap.get(row.cleaner_id) ?? '',
      phone: profile?.phone ?? '',
      hourly_rate: cleaner?.hourly_rate ?? 0,
      address: cleaner?.address ?? '',
      status: row.status as UnifiedApplication['status'],
      submitted_at: row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : '',
      reviewed_at: row.status === 'approved' && row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString() : null,
      id_document_url: row.id_document_url ?? null,
      admin_notes: row.admin_notes ?? null,
      cleans_completed: (cleaner as { cleans_completed?: number } | undefined)?.cleans_completed ?? 0,
      sortKey: row.submitted_at ?? '',
    }
  })

  const customerApplications: (UnifiedApplication & { sortKey: string })[] = (customerRows ?? []).map(row => {
    const profile = profileMap.get(row.id)
    const createdAt = createdAtMap.get(row.id)
    return {
      id: row.id,
      category: 'customer',
      personId: row.id,
      full_name: profile?.full_name ?? '',
      avatar_url: profile?.avatar_url ?? null,
      email: emailMap.get(row.id) ?? '',
      phone: profile?.phone ?? '',
      hourly_rate: null,
      address: row.address ?? '',
      status: (row.status ?? 'approved') as UnifiedApplication['status'],
      submitted_at: createdAt ? new Date(createdAt).toLocaleDateString() : '',
      reviewed_at: row.status === 'approved' && row.status_reviewed_at ? new Date(row.status_reviewed_at).toLocaleDateString() : null,
      id_document_url: null,
      admin_notes: row.admin_notes ?? null,
      cleans_completed: 0,
      sortKey: createdAt ?? '',
    }
  })

  const applications = [...cleanerApplications, ...customerApplications]
    .sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1))
    .map(({ sortKey: _sortKey, ...app }) => app)

  return (
      <div className="px-6 py-6">
        <ApplicationsList applications={applications} />
      </div>
  )
}
