import { createAdminClient } from '@/lib/supabase/admin'
import { fetchSeenMap } from '@/app/admin/seenItems'
import type { BookingResult, BookingStatus } from '@/lib/types/booking'
import type { CustomerHomeInfo } from '@/lib/bookingSummary'

// Shared by /admin/bookings ("Booking Requests" — pending/declined/cancelled)
// and /admin/matches ("Matches" — accepted/completed), which are otherwise
// identical fetch-and-map pipelines that only differ in which statuses they
// pull. Kept here instead of duplicated so cleaner/customer contact fields
// stay in sync between the two lists.
export async function fetchBookingResults(statuses: BookingStatus[]): Promise<BookingResult[]> {
  const admin = createAdminClient()

  const { data: bookingRows } = await admin
    .from('bookings')
    .select('id, cleaner_id, customer_id, service_type, scheduled_date, scheduled_start, duration_hours, address, notes, status, duration_flexible, cleaner_modified, cleaning_type, extras, pets_present, host_present')
    .in('status', statuses)
    .order('scheduled_date', { ascending: false })
    .limit(500)

  const allIds = Array.from(new Set([
    ...(bookingRows ?? []).map(b => b.cleaner_id),
    ...(bookingRows ?? []).map(b => b.customer_id),
  ]))
  const cleanerIds = Array.from(new Set((bookingRows ?? []).map(b => b.cleaner_id)))
  const customerIds = Array.from(new Set((bookingRows ?? []).map(b => b.customer_id)))

  const [{ data: profileRows }, authData, seenMap, { data: cleanerRows }, { data: homeRows }] = await Promise.all([
    allIds.length > 0
      ? admin.from('profiles').select('id, full_name, avatar_url, phone').in('id', allIds)
      : Promise.resolve({ data: [] }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    fetchSeenMap('booking', (bookingRows ?? []).map(b => b.id)),
    // Cleaner rate + the requesting host's home/pet snapshot — both needed to
    // build the shared BookingRequestSummary (see lib/bookingSummary.ts) so
    // admin's "View booking request" popup shows the same full detail every
    // other role sees, not just status/date/address.
    cleanerIds.length > 0
      ? admin.from('cleaners').select('id, hourly_rate').in('id', cleanerIds)
      : Promise.resolve({ data: [] as { id: string; hourly_rate: number | null }[] }),
    customerIds.length > 0
      ? admin.from('customers').select('id, dwelling_type, bedrooms, num_rooms, bathrooms, pet_types, num_pets').in('id', customerIds)
      : Promise.resolve({ data: [] as (CustomerHomeInfo & { id: string })[] }),
  ])

  const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))
  const emailMap = new Map((authData.data?.users ?? []).map(u => [u.id, u.email ?? '']))
  const rateMap = new Map((cleanerRows ?? []).map(c => [c.id, c.hourly_rate]))
  const homeInfoMap = new Map((homeRows ?? []).map(r => [r.id, r]))

  // Plain YYYY-MM-DD comparison against scheduled_date (also stored as
  // YYYY-MM-DD, no time component) — sorts/compares correctly as a string,
  // and is recomputed fresh on every request so "expired" always reflects
  // the actual current date rather than a value baked in at some past load.
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (bookingRows ?? []).map(b => {
    const cleanerProfile = profileMap.get(b.cleaner_id)
    const customerProfile = profileMap.get(b.customer_id)
    return {
      id: b.id,
      cleaner_id: b.cleaner_id,
      cleaner_name: cleanerProfile?.full_name ?? 'Cleaner',
      cleaner_avatar_url: cleanerProfile?.avatar_url ?? null,
      cleaner_email: emailMap.get(b.cleaner_id) ?? '',
      cleaner_phone: cleanerProfile?.phone ?? '',
      customer_id: b.customer_id,
      customer_name: customerProfile?.full_name ?? 'Customer',
      customer_avatar_url: customerProfile?.avatar_url ?? null,
      customer_email: emailMap.get(b.customer_id) ?? '',
      customer_phone: customerProfile?.phone ?? '',
      service_type: b.service_type as BookingResult['service_type'],
      scheduled_date: b.scheduled_date,
      scheduled_start: b.scheduled_start.slice(0, 5),
      duration_hours: b.duration_hours,
      duration_flexible: b.duration_flexible ?? false,
      cleaner_modified: b.cleaner_modified ?? false,
      address: b.address,
      notes: b.notes ?? undefined,
      status: b.status as BookingResult['status'],
      // Still pending (never matched/approved) and the clean's own date has
      // already come and gone — a stronger, more final signal than the
      // existing 2h-staleness "Unmatched" KPI. Purely a display-time flag;
      // deliberately doesn't touch bookings.status (no 'expired' DB value,
      // and lib/expireRequests.ts already owns the real pending->declined
      // transition on cleaner page loads once the 24h response_deadline
      // passes — this is admin-side visibility, not a second source of truth).
      expired: b.status === 'pending' && b.scheduled_date < todayStr,
      seen: seenMap.get(b.id) ?? false,
      cleaning_type: b.cleaning_type,
      extras: b.extras ?? [],
      pets_present: b.pets_present,
      host_present: b.host_present,
      hourly_rate: rateMap.get(b.cleaner_id) ?? null,
      home_info: homeInfoMap.get(b.customer_id) ?? null,
    }
  })
}
