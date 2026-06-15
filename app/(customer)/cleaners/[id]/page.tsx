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

  const { data: cleaner, error } = await supabase
    .from('cleaners')
    .select('id, bio, service_types, hourly_rate, years_experience, languages')
    .eq('id', params.id)
    .neq('status', 'rejected')
    .single()

  if (error || !cleaner) notFound()

  // RLS blocks customer from reading other users' profiles — use admin client
  const { data: profile } = await createAdminClient()
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', params.id)
    .single()

  const { data: galleryRows } = await supabase
    .from('cleaner_gallery')
    .select('id, photo_url')
    .eq('cleaner_id', params.id)
    .order('id', { ascending: true })

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

  const gallery = (galleryRows ?? []).map(r => r.photo_url as string)

  return (
    <div className="max-w-3xl mx-auto">
      <CleanerProfile cleaner={cleanerResult} gallery={gallery} />
    </div>
  )
}
