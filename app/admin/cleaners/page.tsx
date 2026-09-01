import { Nav } from '../Nav'
import { createAdminClient } from '@/lib/supabase/admin'
import { CleanersList } from './CleanersList'
import type { CleanerResult } from '@/lib/types/cleaner'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

export default async function AdminCleanersPage() {
  noStore()
  const admin = createAdminClient()

  const [{ data: cleanerRows }, { data: profileRows }, authData] = await Promise.all([
    admin.from('cleaners').select('id, bio, service_types, hourly_rate, years_experience, languages, status, rating_avg, rating_count, address').neq('status', 'suspended').limit(500),
    admin.from('profiles').select('id, full_name, phone, avatar_url').limit(500),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))
  const emailMap = new Map((authData.data?.users ?? []).map(u => [u.id, u.email ?? '']))

  const cleaners = (cleanerRows ?? []).map(c => {
    const profile = profileMap.get(c.id)
    return {
      id: c.id,
      full_name: profile?.full_name ?? '',
      avatar_url: profile?.avatar_url ?? null,
      bio: c.bio ?? '',
      service_types: (c.service_types ?? []) as string[],
      hourly_rate: c.hourly_rate ?? 0,
      years_experience: c.years_experience ?? 0,
      languages: (c.languages ?? []) as string[],
      distance_km: 0,
      area: (c as { address?: string | null }).address ?? '',
      rating_avg: (c as { rating_avg?: number | null }).rating_avg ?? null,
      rating_count: (c as { rating_count?: number }).rating_count ?? 0,
      email: emailMap.get(c.id) ?? '',
      phone: profile?.phone ?? '',
      adminNotes: '',
    } satisfies CleanerResult & { adminNotes: string }
  })

  return (
    <div className="min-h-screen bg-[#EFEFEF] md:ps-56">
      <Nav />
      <div className="px-6 py-6">
        <CleanersList cleaners={cleaners} />
      </div>
    </div>
  )
}
