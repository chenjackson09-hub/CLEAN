import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { CalendarPicker } from './CalendarPicker'
import { BrowseResults } from './BrowseResults'
import { BrowseFilters } from './BrowseFilters'
import { BrowseTitle } from './BrowseTitle'
import { sortCleaners } from '@/lib/cleanerSearch'
import { geocodeAddress } from '@/lib/geocode'
import { parsePoint, distanceKm } from '@/lib/geo'
import type { CleanerResult, DateGroup } from '@/lib/types/cleaner'

type Props = {
  searchParams: { dates?: string; type?: string; sort?: string; start?: string; duration?: string; location?: string }
}

function toMin(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

export default async function BrowsePage({ searchParams }: Props) {
  const { dates, type, sort, start, duration, location } = searchParams
  const selectedDates = dates ? dates.split(',').filter(Boolean) : []
  const locationQuery = location?.trim() ?? ''
  const hasDates = selectedDates.length > 0
  // Location is required: we only search once the customer tells us where they
  // are, so every result is guaranteed to be a cleaner whose radius covers them.
  const hasLocation = !!locationQuery

  let groups: DateGroup[] | null = null
  // True when the customer entered a location we couldn't resolve to coordinates
  // — distinct from "resolved fine but no cleaner covers it".
  let locationError = false

  if (hasLocation && hasDates) {
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
        .select('id, bio, service_types, hourly_rate, years_experience, languages, location, service_radius_km')
        .eq('status', 'approved')
        .limit(500),
    ])

    const weekly = weeklyRows ?? []
    const dated = dateRows ?? []
    let base = cleanerRows ?? []

    // Requested window from the start time + duration filters (if a start is set).
    const reqStart = start ? toMin(start) : null
    const reqEnd = reqStart !== null ? reqStart + (duration ? parseInt(duration) : 2) * 60 : null

    // Apply service type filter (date-independent).
    if (type) {
      base = base.filter(c => (c.service_types as string[]).includes(type))
    }

    // Location filter: keep only cleaners whose service radius covers the
    // customer's location. A cleaner with no saved location can't be shown to
    // cover it, so they're excluded once a location is being searched. Distance
    // is the same regardless of date, so we compute it once here.
    const distanceById = new Map<string, number>()
    const customerLoc = await geocodeAddress(locationQuery)
    if (!customerLoc) {
      // Address couldn't be resolved — we can't guarantee any match.
      base = []
      locationError = true
    } else {
      base = base.filter(c => {
        const cleanerLoc = parsePoint((c as { location?: unknown }).location)
        if (!cleanerLoc) return false
        const dist = distanceKm(customerLoc, cleanerLoc)
        const radius = (c as { service_radius_km?: number }).service_radius_km ?? 10
        if (dist > radius) return false
        distanceById.set(c.id, dist)
        return true
      })
    }

    // Availability lookups, keyed for per-date grouping.
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

    // Build a CleanerResult for every candidate so each date group can reuse it.
    const ids = base.map(c => c.id)
    const { data: profileRows } = ids.length
      ? await admin.from('profiles').select('id, full_name, avatar_url').in('id', ids)
      : { data: [] as { id: string; full_name: string | null; avatar_url: string | null }[] }
    const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))

    const resultById = new Map<string, CleanerResult>()
    for (const c of base) {
      const p = profileMap.get(c.id)
      resultById.set(c.id, {
        id: c.id,
        full_name: p?.full_name ?? 'Cleaner',
        avatar_url: p?.avatar_url ?? null,
        bio: c.bio ?? '',
        service_types: (c.service_types ?? []) as string[],
        hourly_rate: c.hourly_rate ?? 0,
        years_experience: c.years_experience ?? 0,
        languages: (c.languages ?? []) as string[],
        distance_km: distanceById.get(c.id) ?? 0,
      } satisfies CleanerResult)
    }

    // Default to nearest-first within each day; honor an explicit sort instead.
    const sortKey = sort || 'distance_asc'

    // One group per selected date, earliest (closest) date first. A cleaner
    // appears under a date if they have a specific-date or weekly slot for that
    // day that covers the requested window.
    groups = [...selectedDates].sort().map(dateStr => {
      const dow = new Date(dateStr + 'T00:00:00').getDay()
      const dayCleaners = base
        .filter(c => {
          const slots = [
            ...(weeklyMap.get(c.id)?.get(dow) ?? []),
            ...(dateMap.get(c.id)?.get(dateStr) ?? []),
          ]
          if (slots.length === 0) return false
          if (reqStart === null || reqEnd === null) return true
          // The slot must fully contain the requested start→end window.
          return slots.some(s => toMin(s.start) <= reqStart && toMin(s.end) >= reqEnd)
        })
        .map(c => resultById.get(c.id)!)
      return { date: dateStr, cleaners: sortCleaners(dayCleaners, sortKey) }
    })
  }

  return (
    <div className="max-w-3xl mx-auto">
      <BrowseTitle />

      <Suspense fallback={<div className="bg-white rounded-xl border border-gray-200 h-72 animate-pulse mb-4" />}>
        <CalendarPicker />
      </Suspense>

      <BrowseFilters dates={dates} type={type} sort={sort} start={start} duration={duration} location={location} />

      <BrowseResults hasDates={hasDates} hasLocation={hasLocation} locationError={locationError} location={locationQuery} groups={groups} />
    </div>
  )
}
