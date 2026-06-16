import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CleanerProfile } from './CleanerProfile'
import type { CleanerResult } from '@/lib/types/cleaner'

type Props = {
  params: { id: string }
}

export default async function CleanerProfilePage({ params }: Props) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [
    { data: cleaner, error },
    { data: profile },
    { data: galleryRows },
    { data: weeklyAvailability },
  ] = await Promise.all([
    supabase
      .from('cleaners')
      .select('id, bio, service_types, hourly_rate, years_experience, languages')
      .eq('id', params.id)
      .neq('status', 'rejected')
      .single(),
    admin
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', params.id)
      .single(),
    supabase
      .from('cleaner_gallery')
      .select('photo_url')
      .eq('cleaner_id', params.id)
      .order('id', { ascending: true }),
    supabase
      .from('cleaner_weekly_availability')
      .select('day_of_week, start_time, end_time')
      .eq('cleaner_id', params.id),
  ])

  if (error || !cleaner) notFound()

  const cleanerResult: CleanerResult = {
    id: cleaner.id,
    full_name: profile?.full_name ?? 'Cleaner',
    avatar_url: profile?.avatar_url ?? null,
    bio: cleaner.bio ?? '',
    service_types: (cleaner.service_types ?? []) as string[],
    hourly_rate: cleaner.hourly_rate ?? 0,
    years_experience: cleaner.years_experience ?? 0,
    languages: (cleaner.languages ?? []) as string[],
    distance_km: 0,
  }

  return (
    <div className="max-w-3xl mx-auto">
      <CleanerProfile
        cleaner={cleanerResult}
        gallery={(galleryRows ?? []).map(r => r.photo_url as string)}
        weeklyAvailability={weeklyAvailability ?? []}
      />
    </div>
  )
}
