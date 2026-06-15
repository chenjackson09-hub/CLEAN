import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CalendarPicker } from './CalendarPicker'
import { BrowseResults } from './BrowseResults'
import { BrowseFilters } from './BrowseFilters'
import { BrowseTitle } from './BrowseTitle'
import { sortCleaners } from '@/lib/cleanerSearch'
import type { CleanerResult } from '@/lib/types/cleaner'

type Props = {
  searchParams: { dates?: string; type?: string; sort?: string }
}

export default async function BrowsePage({ searchParams }: Props) {
  const { dates, type, sort } = searchParams
  const selectedDates = dates ? dates.split(',').filter(Boolean) : []
  const hasFilters = selectedDates.length > 0 || !!type

  let cleaners: CleanerResult[] | null = null
  let queryError: string | null = null

  const supabase = await createClient()

  const daysOfWeek = [...new Set(
    selectedDates.map(d => new Date(d + 'T00:00:00').getDay())
  )]

  if (hasFilters) {
    const { data: availRows } = await supabase
      .from('cleaner_weekly_availability')
      .select('cleaner_id, day_of_week')

    const avail = availRows ?? []

    let availableIds: string[] | null = null
    if (daysOfWeek.length > 0 && avail.length > 0) {
      const map = new Map<string, Set<number>>()
      for (const row of avail) {
        if (!map.has(row.cleaner_id)) map.set(row.cleaner_id, new Set())
        map.get(row.cleaner_id)!.add(row.day_of_week)
      }
      const matchingIds = [...map.entries()]
        .filter(([, days]) => daysOfWeek.every(d => days.has(d)))
        .map(([id]) => id)
      const cleanerIdsWithRows = new Set(avail.map(r => r.cleaner_id))
      const { data: allCleanerRows } = await supabase.from('cleaners').select('id').neq('status', 'rejected')
      const openScheduleIds = (allCleanerRows ?? []).map(c => c.id).filter(id => !cleanerIdsWithRows.has(id))
      availableIds = [...new Set([...matchingIds, ...openScheduleIds])]
    }

    if (availableIds !== null && availableIds.length === 0) {
      cleaners = []
    } else {
      // Query cleaners without join — avoids !inner silently dropping rows
      let cleanerQuery = supabase
        .from('cleaners')
        .select('id, bio, service_types, hourly_rate, years_experience, languages')
        .neq('status', 'rejected')

      if (availableIds && availableIds.length > 0) {
        cleanerQuery = cleanerQuery.in('id', availableIds) as typeof cleanerQuery
      }
      if (type) {
        cleanerQuery = cleanerQuery.contains('service_types', [type]) as typeof cleanerQuery
      }

      const { data: cleanerRows, error: cleanerErr } = await cleanerQuery

      if (cleanerErr) {
        queryError = `cleaners: ${cleanerErr.message}`
        cleaners = []
      } else if (!cleanerRows || cleanerRows.length === 0) {
        cleaners = []
      } else {
        // Fetch profiles via admin client — RLS blocks customer from reading other users' profiles
        const ids = cleanerRows.map(c => c.id)
        const { data: profileRows, error: profileErr } = await createAdminClient()
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', ids)

        if (profileErr) {
          queryError = `profiles: ${profileErr.message}`
        }

        const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))

        cleaners = cleanerRows.map(c => {
          const p = profileMap.get(c.id)
          return {
            id: c.id,
            full_name: p?.full_name ?? 'Cleaner',
            avatar_url: p?.avatar_url ?? null,
            bio: c.bio ?? '',
            service_types: (c.service_types ?? []) as string[],
            hourly_rate: c.hourly_rate ?? 0,
            years_experience: c.years_experience ?? 0,
            languages: (c.languages ?? []) as string[],
            distance_km: 0,
          } satisfies CleanerResult
        })
        cleaners = sortCleaners(cleaners, sort ?? '')
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <BrowseTitle />

      <Suspense fallback={<div className="bg-white rounded-xl border border-gray-200 h-72 animate-pulse mb-4" />}>
        <CalendarPicker />
      </Suspense>

      {queryError && (
        <p className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          DB error: {queryError}
        </p>
      )}

      {selectedDates.length > 0 && (
        <BrowseFilters dates={dates} type={type} sort={sort} />
      )}

      <BrowseResults hasFilters={hasFilters} error={false} cleaners={cleaners} />
    </div>
  )
}
