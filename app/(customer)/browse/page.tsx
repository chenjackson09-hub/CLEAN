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

  if (hasFilters) {
    const supabase = await createClient()

    const daysOfWeek = Array.from(new Set(
      selectedDates.map(d => new Date(d + 'T00:00:00').getDay())
    ))

    // Fetch availability and all cleaners in parallel — no sequential dependency
    const [{ data: availRows }, { data: cleanerRows }] = await Promise.all([
      supabase
        .from('cleaner_weekly_availability')
        .select('cleaner_id, day_of_week'),
      supabase
        .from('cleaners')
        .select('id, bio, service_types, hourly_rate, years_experience, languages')
        .neq('status', 'rejected'),
    ])

    const avail = availRows ?? []
    let filtered = cleanerRows ?? []

    // Filter by availability client-side (no extra round-trip)
    if (daysOfWeek.length > 0 && avail.length > 0) {
      const map = new Map<string, Set<number>>()
      for (const row of avail) {
        if (!map.has(row.cleaner_id)) map.set(row.cleaner_id, new Set())
        map.get(row.cleaner_id)!.add(row.day_of_week)
      }
      const withRows = new Set(avail.map(r => r.cleaner_id))
      filtered = filtered.filter(c => {
        if (!withRows.has(c.id)) return true // no rows = open schedule
        const days = map.get(c.id)
        return !!days && daysOfWeek.every(d => days.has(d))
      })
    }

    // Apply service type filter client-side
    if (type) {
      filtered = filtered.filter(c => (c.service_types as string[]).includes(type))
    }

    if (filtered.length === 0) {
      cleaners = []
    } else {
      // Fetch profiles for matched cleaners (RLS bypass via admin)
      const ids = filtered.map(c => c.id)
      const { data: profileRows } = await createAdminClient()
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', ids)

      const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))

      cleaners = filtered.map(c => {
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

  return (
    <div className="max-w-3xl mx-auto">
      <BrowseTitle />

      <Suspense fallback={<div className="bg-white rounded-xl border border-gray-200 h-72 animate-pulse mb-4" />}>
        <CalendarPicker />
      </Suspense>

      {selectedDates.length > 0 && (
        <BrowseFilters dates={dates} type={type} sort={sort} />
      )}

      <BrowseResults hasFilters={hasFilters} error={false} cleaners={cleaners} />
    </div>
  )
}
