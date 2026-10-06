import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/lib/supabase/server'
import { HostCalendar } from './HostCalendar'
import { WaitlistNotice } from './WaitlistNotice'
import { sortCleaners } from '@/lib/cleanerSearch'
import { geocodeAddress } from '@/lib/geocode'
import { parsePoint, distanceKm } from '@/lib/geo'
import { extractArea } from '@/lib/bookingArea'
import type { CleanerResult } from '@/lib/types/cleaner'
import type { DayAvailEntry, HostBooking, HostBookingStatus, RebookInfo } from '@/lib/hostCalendar'

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// The host's schedule: one calendar showing, per day, the host's own booked
// cleans and requests plus how many cleaners are free, with a sheet per day to
// see who's booked / asked / free and to send requests. This page only gathers
// the data; HostCalendar owns the interaction.
export default async function BrowsePage({ searchParams }: { searchParams?: { rebook?: string } }) {
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

  // Approval gate, queried separately from the address/lat/lng fetch above so
  // that a stale schema cache or not-yet-run migration on this one column
  // can't take down the address lookup too. Fail OPEN: only gate when we
  // positively know the customer isn't approved — anything else (query
  // error, no row, column missing) falls through to normal browsing so an
  // infra hiccup here can never lock out an already-working customer.
  const { data: statusRow } = user
    ? await admin.from('customers').select('status').eq('id', user.id).single<{ status: string | null }>()
    : { data: null }
  const isPendingApproval = statusRow?.status === 'pending' || statusRow?.status === 'rejected'

  if (user && isPendingApproval) {
    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).single()
    const firstName = (profile?.full_name ?? '').trim().split(' ')[0] ?? ''
    return (
      <div className="max-w-3xl mx-auto">
        <WaitlistNotice name={firstName} />
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = ymd(today)

  // ── The host's own bookings (pending / accepted / past), for the day markers ──
  const since = new Date(today)
  since.setDate(since.getDate() - 60)
  const { data: bookingRows } = user
    ? await admin
        .from('bookings')
        .select('id, cleaner_id, scheduled_date, scheduled_start, duration_hours, status, response_deadline, clean_group_id')
        .eq('customer_id', user.id)
        .gte('scheduled_date', ymd(since))
        .order('scheduled_date')
        .limit(400)
        .returns<{
          id: string; cleaner_id: string; scheduled_date: string; scheduled_start: string; duration_hours: number
          status: HostBookingStatus; response_deadline: string; clean_group_id: string | null
        }[]>()
    : { data: null }
  // The block a booking consumed (migration 0035) is read on its own so a not-yet-
  // applied migration can never take the calendar down — it just shows start times.
  const { data: slotRows } = user
    ? await admin
        .from('bookings')
        .select('id, slot_start, slot_end')
        .eq('customer_id', user.id)
        .gte('scheduled_date', ymd(since))
        .returns<{ id: string; slot_start: string | null; slot_end: string | null }[]>()
    : { data: null }
  const slotById = new Map((slotRows ?? []).map(r => [r.id, r]))
  const bookingCleanerIds = Array.from(new Set((bookingRows ?? []).map(b => b.cleaner_id)))
  const { data: bookingCleanerProfiles } = bookingCleanerIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', bookingCleanerIds)
    : { data: [] as { id: string; full_name: string | null }[] }
  const bookingNameById = new Map((bookingCleanerProfiles ?? []).map(p => [p.id, p.full_name ?? 'Cleaner']))
  const now = Date.now()
  const myBookings: HostBooking[] = (bookingRows ?? []).map(b => ({
    id: b.id,
    date: b.scheduled_date,
    start: b.scheduled_start.slice(0, 5),
    durationHours: b.duration_hours,
    // A pending request past its 24h deadline is effectively declined.
    status: b.status === 'pending' && new Date(b.response_deadline).getTime() < now ? 'declined' : b.status,
    cleanerId: b.cleaner_id,
    cleanerName: bookingNameById.get(b.cleaner_id) ?? 'Cleaner',
    groupId: b.clean_group_id,
    slotStart: slotById.get(b.id)?.slot_start ?? null,
    slotEnd: slotById.get(b.id)?.slot_end ?? null,
  }))

  // "Find another cleaner": reopen one of the host's own cancelled requests. Read
  // on its own (admin client, scoped to this host) so it can never break the page.
  let rebook: RebookInfo | undefined
  if (user && searchParams?.rebook) {
    const { data: old } = await admin
      .from('bookings')
      .select('id, cleaner_id, scheduled_date, scheduled_start, duration_hours, address, notes, cleaning_type, extras, pets_present, host_present')
      .eq('id', searchParams.rebook)
      .eq('customer_id', user.id)
      .eq('status', 'cancelled')
      .maybeSingle<{
        id: string; cleaner_id: string; scheduled_date: string; scheduled_start: string; duration_hours: number
        address: string | null; notes: string | null; cleaning_type: 'regular' | 'deep' | null
        extras: string[] | null; pets_present: boolean | null; host_present: boolean | null
      }>()
    if (old) {
      const { data: who } = await admin.from('profiles').select('full_name').eq('id', old.cleaner_id).maybeSingle<{ full_name: string | null }>()
      rebook = {
        bookingId: old.id,
        date: old.scheduled_date,
        cleanerId: old.cleaner_id,
        cleanerName: who?.full_name ?? '',
        address: old.address,
        duration: old.duration_hours,
        prefill: {
          startTime: old.scheduled_start.slice(0, 5),
          notes: old.notes ?? '',
          cleaningType: old.cleaning_type ?? undefined,
          extras: old.extras ?? [],
          petsPresent: old.pets_present,
          hostPresent: old.host_present,
        },
      }
    }
  }

  const locationQuery = customer?.address?.trim() ?? ''
  // The customer has a usable location when they've saved an address.
  const hasLocation = !!locationQuery

  let cleaners: CleanerResult[] = []
  const dayAvail: Record<string, DayAvailEntry[]> = {}
  // True when the saved address can't be resolved to coordinates — distinct from
  // "resolved fine but no cleaner covers it".
  let locationError = false

  if (hasLocation) {
    // Window: today through ~4 months out. Weekly availability repeats by weekday
    // so it needs no date range; only specific-date rows are range-bounded.
    const HEAT_DAYS = 120
    const end = new Date(today)
    end.setDate(end.getDate() + HEAT_DAYS)

    // Use admin client so RLS doesn't block reading availability or cleaners.
    const [{ data: weeklyRows }, { data: cleanerRows }] = await Promise.all([
      admin
        .from('cleaner_weekly_availability')
        .select('cleaner_id, day_of_week, start_time, end_time')
        .limit(500),
      admin
        .from('cleaners')
        .select('id, address, bio, service_types, hourly_rate, years_experience, languages, location, service_radius_km, rating_avg, rating_count, min_hours, max_hours')
        .eq('status', 'approved')
        .limit(500),
    ])

    let base = cleanerRows ?? []

    // Location filter: keep only cleaners whose service radius covers the
    // customer's location. A cleaner with no saved location can't be shown to
    // cover it, so they're excluded. Prefer the coords saved with the profile
    // address; geocode only as a fallback (e.g. a row saved before geocoding ran).
    const distanceById = new Map<string, number>()
    const customerLoc =
      customer?.lat != null && customer?.lng != null
        ? { lat: customer.lat, lng: customer.lng }
        : await geocodeAddress(locationQuery)
    if (!customerLoc) {
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

    if (inRange.size > 0) {
      const ids = Array.from(inRange)
      const [{ data: dateRows }, { data: profileRows }] = await Promise.all([
        admin
          .from('cleaner_availability')
          .select('cleaner_id, date, start_time, end_time')
          .in('cleaner_id', ids)
          .gte('date', todayStr)
          .lte('date', ymd(end))
          .limit(5000),
        admin.from('profiles').select('id, full_name, avatar_url').in('id', ids),
      ])
      const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))

      // Every in-range cleaner once (nearest first); a day's list just points at them.
      cleaners = sortCleaners(
        base.map(c => {
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
            area: extractArea((c as { address?: string | null }).address ?? '') ?? undefined,
            distance_km: distanceById.get(c.id) ?? 0,
            rating_avg: (c as { rating_avg?: number | null }).rating_avg ?? null,
            rating_count: (c as { rating_count?: number }).rating_count ?? 0,
            min_hours: (c as { min_hours?: number | null }).min_hours ?? null,
            max_hours: (c as { max_hours?: number | null }).max_hours ?? null,
          } satisfies CleanerResult
        }),
        'distance_asc',
      )

      // cleaner → weekday / date → slots
      const weeklyMap = new Map<string, Map<number, { start: string; end: string }[]>>()
      for (const row of weeklyRows ?? []) {
        if (!inRange.has(row.cleaner_id)) continue
        const m = weeklyMap.get(row.cleaner_id) ?? new Map()
        m.set(row.day_of_week, [...(m.get(row.day_of_week) ?? []), { start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) }])
        weeklyMap.set(row.cleaner_id, m)
      }
      const dateMap = new Map<string, Map<string, { start: string; end: string }[]>>()
      for (const row of dateRows ?? []) {
        const m = dateMap.get(row.cleaner_id) ?? new Map()
        m.set(row.date, [...(m.get(row.date) ?? []), { start: row.start_time.slice(0, 5), end: row.end_time.slice(0, 5) }])
        dateMap.set(row.cleaner_id, m)
      }

      for (let i = 0; i <= HEAT_DAYS; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() + i)
        const ds = ymd(d)
        const entries: DayAvailEntry[] = []
        for (const c of cleaners) {
          const raw = [...(weeklyMap.get(c.id)?.get(d.getDay()) ?? []), ...(dateMap.get(c.id)?.get(ds) ?? [])]
          if (raw.length === 0) continue
          // De-dup (weekly + specific-date can overlap) and sort for a stable label.
          const seen = new Set<string>()
          const slots = raw
            .filter(s => {
              const k = `${s.start}-${s.end}`
              if (seen.has(k)) return false
              seen.add(k)
              return true
            })
            .sort((a, b) => a.start.localeCompare(b.start))
          entries.push({ id: c.id, slots })
        }
        if (entries.length > 0) dayAvail[ds] = entries
      }
    }
  }

  return (
    // A fixed-height column (the viewport minus the header) so the whole month,
    // its key and the controls fit on screen with no scrolling.
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100dvh-8rem)] min-h-[28rem]">
      <HostCalendar
        todayStr={todayStr}
        hasLocation={hasLocation}
        locationError={locationError}
        location={locationQuery}
        cleaners={cleaners}
        dayAvail={dayAvail}
        bookings={myBookings}
        rebook={rebook}
      />
    </div>
  )
}
