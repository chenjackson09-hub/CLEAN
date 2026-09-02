import { createAdminClient } from '@/lib/supabase/admin'
import { ApplicationsList } from './ApplicationsList'
import type { CleanerApplicationResult } from '@/lib/types/application'

// Reads live admin data (listUsers); render on demand like the other admin pages.
export const dynamic = 'force-dynamic'

export default async function ApplicationsPage() {
  const admin = createAdminClient()

  const [{ data: appRows }, { data: cleanerRows }, { data: profileRows }, authData] = await Promise.all([
    admin.from('cleaner_applications').select('id, status, submitted_at, reviewed_at, cleaner_id, id_document_url, admin_notes').order('submitted_at', { ascending: false }),
    admin.from('cleaners').select('id, bio, service_types, hourly_rate, years_experience, languages, address'),
    admin.from('profiles').select('id, full_name, phone, avatar_url'),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const cleanerMap = new Map((cleanerRows ?? []).map(c => [c.id, c]))
  const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))
  const emailMap = new Map((authData.data?.users ?? []).map(u => [u.id, u.email ?? '']))

  type App = CleanerApplicationResult & { cleaner_id: string }

  const applications: App[] = (appRows ?? []).map(row => {
    const cleaner = cleanerMap.get(row.cleaner_id)
    const profile = profileMap.get(row.cleaner_id)
    return {
      id: row.id,
      cleaner_id: row.cleaner_id,
      full_name: profile?.full_name ?? '',
      avatar_url: profile?.avatar_url ?? null,
      email: emailMap.get(row.cleaner_id) ?? '',
      phone: profile?.phone ?? '',
      bio: cleaner?.bio ?? '',
      service_types: (cleaner?.service_types ?? []) as ('residential' | 'commercial')[],
      hourly_rate: cleaner?.hourly_rate ?? 0,
      years_experience: cleaner?.years_experience ?? 0,
      languages: (cleaner?.languages ?? []) as string[],
      address: cleaner?.address ?? '',
      status: row.status as CleanerApplicationResult['status'],
      submitted_at: row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : '',
      reviewed_at: row.status === 'approved' && row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString() : null,
      id_document_url: row.id_document_url ?? null,
      admin_notes: row.admin_notes ?? null,
    }
  })

  return (
      <div className="px-6 py-6">
        <ApplicationsList applications={applications} />
      </div>
  )
}
