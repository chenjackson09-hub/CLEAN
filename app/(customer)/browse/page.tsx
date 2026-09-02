import { Suspense } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'
import { CalendarPicker } from './CalendarPicker'
import { BrowseResults } from './BrowseResults'
import { BrowseFilters } from './BrowseFilters'
import { BrowseTitle } from './BrowseTitle'
import { sortCleaners } from '@/lib/cleanerSearch'
import { geocodeAddress } from '@/lib/geocode'
import { parsePoint, distanceKm } from '@/lib/geo'
import type { CleanerResult, DateGroup } from '@/lib/types/cleaner'

type Props = {
  searchParams: { dates?: string; sort?: string; from?: string; to?: string; duration?: string }
}

function toMin(t: string): number {
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function BrowsePage({ searchParams }: Props) {
  const { dates, sort, from, to, duration } = searchParams
  const selectedDates = dates ? dates.split(',').filter(Boolean) : []
  const hasDates = selectedDates.length > 0

  // A concrete duration from the search filter locks the booking form's duration
  // field. The "Not sure" option (duration === 'any') or no filter leaves it
  // editable, so presetDuration stays undefined.
  const parsedDuration = duration && duration !== 'any' ? parseInt(duration) : NaN
  const presetDuration = Number.isFinite(parsedDuration) ? parsedDuration : undefined

  const admin = createAdminClient()

  // The customer's location comes from their profile, not a search field — we
  // read the address they saved (and its geocoded coords) on /profile.
  const user = await getCurrentUser()
  const { data: customer } = user
    ? await admin
        .from('customers')
        .select('address, lat, lng')
        .eq('id', user.id)
        .single<{ address: string | null; lat: number | null; lng: number | null }>()
    : { data: null }

  const locationQuery = customer?.address?.trim() ?? ''
  // The customer has a usable location when they've saved an address.
  const hasLocation = !!locationQuery

  let groups: DateGroup[] | null = null
  // True when the saved address can't be resolved to coordinates — distinct from
  // "resolved fine but no cleaner covers it".
  let locationError = false
  // Per-date "heat" for the calendar: how many in-range cleaners have any
  // availability that day, bucketed high/medium/low. Built whenever we know the
  // customer's location — even before any dates are picked — so the calendar
  // reflects real, in-range coverage instead of a static weekday guess.
  const dateHeat: Record<string, 'high' | 'medium' | 'low'> = {}

  if (hasLocation) {
    // Calendar heat window: today through ~4 months out. Weekly availability
    // repeats by weekday so it needs no date range; only specific-date rows are
    // range-bounded. Extend the upper bound to cover any far-future selected
    // date so the day-group query below still sees its rows.
    const HEAT_DAYS = 120
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const heatStart = ymd(today)
    const heatEndDate = new Date(today)
    heatEndDate.setDate(heatEndDate.getDate() + HEAT_DAYS)
    const heatEnd = ymd(heatEndDate)
    const maxSelected = selectedDates.length ? [...selectedDates].sort().at(-1)! : heatStart
    const datedUpper = maxSelected > heatEnd ? maxSelected : heatEnd

    // Use admin client so RLS doesn't block reading availability or cleaners.
    const [{ data: weeklyRows }, { data: cleanerRows }] = await Promise.all([
      admin
        .from('cleaner_weekly_availability')
        .select('cleaner_id, day_of_week, start_time, end_time')
        .limit(500),
      admin
        .from('cleaners')
        .select('id, bio, service_types, hourly_rate, years_experience, languages, location, service_radius_km, rating_avg, rating_count, min_hours, max_hours')
        .eq('status', 'approved')
        .limit(500),
    ])

    const weekly = weeklyRows ?? []
    let base = cleanerRows ?? []

    // Availability range the customer is free in (the dual-thumb slider). When
    // set, a cleaner matches a day if their availability overlaps this range by a
    // long enough *continuous* block — see the day-group filter below.
    const rangeFrom = from ? toMin(from) : null
    const rangeTo = to ? toMin(to) : null
    const hasRange = rangeFrom !== null && rangeTo !== null && rangeTo > rangeFrom

    // Duration filter (date-independent): when the customer picked a specific
    // duration, hide cleaners whose accepted ceiling (max_hours) can't take it.
    // min_hours is informational only (shown on the cleaner's profile as their
    // stated standard) and no longer filters results. "Not sure" (duration ===
    // 'any') applies no such filter. See migration 0013.
    const reqDuration = duration && duration !== 'any' ? parseInt(duration) : null
    if (reqDuration != null && Number.isFinite(reqDuration)) {
      base = base.filter(c => {
        const max = (c as { max_hours?: number | null }).max_hours
        if (max != null && reqDuration > max) return false
        return true
      })
    }

    // Location filter: keep only cleaners whose service radius covers the
    // customer's location. A cleaner with no saved location can't be shown to
    // cover it, so they're excluded once a location is being searched. Distance
    // is the same regardless of date, so we compute it once here.
    const distanceById = new Map<string, number>()
    // Prefer the coords saved with the profile address; geocode only as a
    // fallback (e.g. an older row saved before geocoding ran).
    const customerLoc =
      customer?.lat != null && customer?.lng != null
        ? { lat: customer.lat, lng: customer.lng }
        : await geocodeAddress(locationQuery)
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
    const inRange = new Set(base.map(c => c.id))

    // Specific-date availability, scoped to the in-range cleaners and the heat
    // window (fetched after the distance filter so the range query stays small).
    const { data: dateRows } = inRange.size
      ? await admin
          .from('cleaner_availability')
          .select('cleaner_id, date, start_time, end_time')
          .in('cleaner_id', Array.from(inRange))
          .gte('date', heatStart)
          .lte('date', datedUpper)
          .limit(5000)
      : { data: [] as { cleaner_id: string; date: string; start_time: string; end_time: string }[] }
    const dated = dateRows ?? []

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

    // Calendar heat: per day in the window, count in-range cleaners with ANY
    // availability (weekly OR specific-date) and bucket by share of the in-range
    // pool. Deliberately ignores the time/duration/type refinements — it's a
    // coarse "how many cleaners near you are around that day" signal. When the
    // location resolved but no cleaner covers it, every day reads 'low'.
    if (!locationError) {
      // In-range cleaners that have a weekly slot, grouped by weekday.
      const weeklyByDow = new Map<number, Set<string>>()
      for (const row of weekly) {
        if (!inRange.has(row.cleaner_id)) continue
        if (!weeklyByDow.has(row.day_of_week)) weeklyByDow.set(row.day_of_week, new Set())
        weeklyByDow.get(row.day_of_week)!.add(row.cleaner_id)
      }
      // In-range cleaners with a specific-date slot, grouped by date (dated rows
      // are already scoped to in-range cleaners by the query above).
      const datedByDate = new Map<string, Set<string>>()
      for (const row of dated) {
        if (!datedByDate.has(row.date)) datedByDate.set(row.date, new Set())
        datedByDate.get(row.date)!.add(row.cleaner_id)
      }
      const total = inRange.size
      for (let i = 0; i <= HEAT_DAYS; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() + i)
        const ds = ymd(d)
        const ids = new Set(weeklyByDow.get(d.getDay()) ?? [])
        ;(datedByDate.get(ds) ?? new Set<string>()).forEach(id => ids.add(id))
        const ratio = total > 0 ? ids.size / total : 0
        dateHeat[ds] = ids.size === 0 ? 'low' : ratio >= 0.66 ? 'high' : 'medium'
      }
    }

    if (hasDates) {
      // Build a CleanerResult for every candidate so each date group can reuse it.
      const ids = Array.from(inRange)
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
          rating_avg: (c as { rating_avg?: number | null }).rating_avg ?? null,
          rating_count: (c as { rating_count?: number }).rating_count ?? 0,
          min_hours: (c as { min_hours?: number | null }).min_hours ?? null,
          max_hours: (c as { max_hours?: number | null }).max_hours ?? null,
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
          .map(c => {
            const slots = [
              ...(weeklyMap.get(c.id)?.get(dow) ?? []),
              ...(dateMap.get(c.id)?.get(dateStr) ?? []),
            ]
            return { c, slots }
          })
          .filter(({ c, slots }) => {
            if (slots.length === 0) return false
            if (!hasRange || rangeFrom === null || rangeTo === null) return true
            // Longest *continuous* overlap (minutes) between the customer's range
            // and any single availability slot — a clean can't span a gap, so we
            // take the best single block, not the summed total.
            const bestOverlap = Math.max(
              0,
              ...slots.map(s => Math.min(toMin(s.end), rangeTo) - Math.max(toMin(s.start), rangeFrom)),
            )
            if (bestOverlap <= 0) return false
            // The overlap must fit the customer's chosen duration, if any —
            // min_hours is informational only and no longer required here.
            const requiredMin = (reqDuration ?? 0) * 60
            return bestOverlap >= requiredMin
          })
          .map(({ c, slots }) => {
            // De-dup (weekly + specific-date can overlap) and sort for a stable
            // availability label on the card, shown for this specific date.
            const seen = new Set<string>()
            const availability = slots
              .filter(s => {
                const k = `${s.start}-${s.end}`
                if (seen.has(k)) return false
                seen.add(k)
                return true
              })
              .sort((a, b) => a.start.localeCompare(b.start))
            return { ...resultById.get(c.id)!, availability }
          })
        return { date: dateStr, cleaners: sortCleaners(dayCleaners, sortKey) }
      })
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <BrowseTitle />

      {/* On desktop the filters/sorting sit to the left of a compact calendar;
          on mobile they stack (calendar first, then filters) as before. */}
      <div className="mb-4 lg:flex lg:items-start lg:gap-4">
        <div className="lg:order-1 lg:w-96 lg:shrink-0">
          <Suspense fallback={<div className="bg-white rounded-xl border border-gray-200 h-72 animate-pulse mb-4" />}>
            <CalendarPicker dateHeat={dateHeat} />
          </Suspense>
        </div>

        <div className="lg:order-2 lg:flex-1 lg:min-w-0">
          <BrowseFilters dates={dates} sort={sort} from={from} to={to} duration={duration} />
        </div>
      </div>

      <BrowseResults hasDates={hasDates} hasLocation={hasLocation} locationError={locationError} location={locationQuery} duration={presetDuration} availFrom={from} availTo={to} groups={groups} />
    </div>
  )
}
