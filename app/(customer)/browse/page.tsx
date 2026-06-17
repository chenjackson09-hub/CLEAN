import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { CalendarPicker } from './CalendarPicker'
import { BrowseResults } from './BrowseResults'
import { BrowseFilters } from './BrowseFilters'
import { BrowseTitle } from './BrowseTitle'
import { sortCleaners } from '@/lib/cleanerSearch'
import type { CleanerResult } from '@/lib/types/cleaner'

type Props = {
  searchParams: { dates?: string; type?: string; sort?: string; start?: string; duration?: string }
}

function toMin(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

export default async function BrowsePage({ searchParams }: Props) {
  const { dates, type, sort, start, duration } = searchParams
  const selectedDates = dates ? dates.split(',').filter(Boolean) : []
  const hasFilters = selectedDates.length > 0 || !!type

  let cleaners: CleanerResult[] | null = null

  if (hasFilters) {
    const admin = createAdminClient()

    // Use admin client so RLS doesn't block reading availability or cleaners
    const [{ data: weeklyRows }, { data: dateRows }, { data: cleanerRows }] = await Promise.all([
      admin
        .from('cleaner_weekly_availability')
        .select('cleaner_id, day_of_week, start_time, end_time')
        .limit(500),
      admin
        .from('cleaner_availability')
        .select('cleaner_id, date, start_time, end_time')
        .in('date', selectedDates)
        .limit(1000),
      admin
        .from('cleaners')
        .select('id, bio, service_types, hourly_rate, years_experience, languages')
        .eq('status', 'approved')
        .limit(500),
    ])

    const weekly = weeklyRows ?? []
    const dated = dateRows ?? []
    let filtered = cleanerRows ?? []

    // Requested window from the start time + duration filters (if a start is set).
    const reqStart = start ? toMin(start) : null
    const reqEnd = reqStart !== null ? reqStart + (duration ? parseInt(duration) : 2) * 60 : null

    // Filter by availability. A cleaner is bookable on a selected date if they
    // have a specific-date slot for that exact date OR a recurring weekly slot
    // for that weekday that covers the requested window. If no availability
    // exists at all, show nothing.
    if (selectedDates.length > 0 && weekly.length === 0 && dated.length === 0) {
      filtered = []
    } else if (selectedDates.length > 0) {
      // cleaner_id → day_of_week → [{start, end}]
      const weeklyMap = new Map<string, Map<number, Array<{ start: string; end: string }>>>()
      for (const row of weekly) {
        if (!weeklyMap.has(row.cleaner_id)) weeklyMap.set(row.cleaner_id, new Map())
        const m = weeklyMap.get(row.cleaner_id)!
        if (!m.has(row.day_of_week)) m.set(row.day_of_week, [])
        m.get(row.day_of_week)!.push({ start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) })
      }
      // cleaner_id → date → [{start, end}]
      const dateMap = new Map<string, Map<string, Array<{ start: string; end: string }>>>()
      for (const row of dated) {
        if (!dateMap.has(row.cleaner_id)) dateMap.set(row.cleaner_id, new Map())
        const m = dateMap.get(row.cleaner_id)!
        if (!m.has(row.date)) m.set(row.date, [])
        m.get(row.date)!.push({ start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) })
      }

      filtered = filtered.filter(c =>
        selectedDates.every(dateStr => {
          const dow = new Date(dateStr + 'T00:00:00').getDay()
          const slots = [
            ...(weeklyMap.get(c.id)?.get(dow) ?? []),
            ...(dateMap.get(c.id)?.get(dateStr) ?? []),
          ]
          if (slots.length === 0) return false
          if (reqStart === null || reqEnd === null) return true
          // The slot must fully contain the requested start→end window.
          return slots.some(s => toMin(s.start) <= reqStart && toMin(s.end) >= reqEnd)
        })
      )
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
      const { data: profileRows } = await admin
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
        <BrowseFilters dates={dates} type={type} sort={sort} start={start} duration={duration} />
      )}

      <BrowseResults hasFilters={hasFilters} error={false} cleaners={cleaners} />
    </div>
  )
}
