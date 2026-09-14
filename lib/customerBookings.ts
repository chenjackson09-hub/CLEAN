import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BookingResult } from '@/lib/types/booking'
import type { CustomerHomeInfo } from '@/lib/bookingSummary'

// Shared by /bookings and /home so the two pages' booking data can't drift —
// same query, same cleaner-profile join, same rating lookup, same "expired
// pending request reads as declined" mapping.
export async function fetchCustomerBookingResults(userId: string): Promise<BookingResult[]> {
  const supabase = await createClient()

  const { data: rawBookings } = await supabase
    .from('bookings')
    .select('id, service_type, scheduled_date, scheduled_start, duration_hours, duration_flexible, address, notes, status, response_deadline, cleaner_id, cleaner_modified, customer_ack_inactive, cleaning_type, extras, pets_present, host_present, created_at')
    .eq('customer_id', userId)
    .order('created_at', { ascending: false })

  const now = Date.now()

  // The customer's own ratings (rater_id = user.id), keyed by the cleaner they
  // rated — there's one editable rating per cleaner, so every completed booking
  // with that cleaner seeds the same score. RLS lets a rater read their own rows.
  const { data: myRatings } = await supabase
    .from('ratings')
    .select('ratee_id, score')
    .eq('rater_id', userId)
  const ratingMap = Object.fromEntries((myRatings ?? []).map(r => [r.ratee_id, r.score]))

  // The customer's own home/pet snapshot, for every booking's "Your home"/
  // "Pets" rows in the shared BookingRequestSummary (see lib/bookingSummary.ts)
  // — it's the same one row regardless of which booking is being viewed.
  const { data: homeRow } = await supabase
    .from('customers')
    .select('dwelling_type, bedrooms, num_rooms, bathrooms, pet_types, num_pets')
    .eq('id', userId)
    .single<CustomerHomeInfo>()

  const cleanerIds = Array.from(new Set((rawBookings ?? []).map(b => b.cleaner_id)))

  // Read cleaner profiles + rate with the service-role client: RLS prevents a
  // customer's session from reading other users' `profiles`/`cleaners` rows,
  // so the session client would return nothing and every booking would fall
  // back to the literal "Cleaner".
  const admin = createAdminClient()
  const [{ data: cleanerProfiles }, { data: cleanerRows }] = cleanerIds.length > 0
    ? await Promise.all([
        admin.from('profiles').select('id, full_name, avatar_url, phone').in('id', cleanerIds),
        admin.from('cleaners').select('id, hourly_rate, address').in('id', cleanerIds),
      ])
    : [{ data: [] }, { data: [] }]

  const profileMap = Object.fromEntries((cleanerProfiles ?? []).map(p => [p.id, p]))
  const rateMap = Object.fromEntries((cleanerRows ?? []).map(c => [c.id, c.hourly_rate]))
  const cleanerAddressMap = Object.fromEntries((cleanerRows ?? []).map(c => [c.id, c.address]))

  return (rawBookings ?? []).map(b => {
    const cleaner = profileMap[b.cleaner_id]
    // A pending request past its 24h response deadline is effectively declined —
    // surface that to the customer instead of leaving it "pending" forever.
    const expired = b.status === 'pending' && new Date(b.response_deadline).getTime() < now
    return {
      id: b.id,
      cleaner_id: b.cleaner_id,
      cleaner_name: cleaner?.full_name ?? 'Cleaner',
      cleaner_avatar_url: cleaner?.avatar_url ?? null,
      cleaner_phone: cleaner?.phone ?? undefined,
      service_type: b.service_type as 'residential' | 'commercial',
      scheduled_date: b.scheduled_date,
      scheduled_start: b.scheduled_start,
      duration_hours: b.duration_hours,
      duration_flexible: b.duration_flexible ?? false,
      address: b.address,
      notes: b.notes ?? undefined,
      status: (expired ? 'declined' : b.status) as 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled',
      cleaner_modified: b.cleaner_modified ?? false,
      customer_ack_inactive: b.customer_ack_inactive ?? false,
      my_rating: ratingMap[b.cleaner_id] ?? null,
      cleaning_type: b.cleaning_type,
      extras: b.extras ?? [],
      pets_present: b.pets_present,
      host_present: b.host_present,
      hourly_rate: rateMap[b.cleaner_id] ?? null,
      home_info: homeRow ?? null,
      created_at: b.created_at,
      cleaner_address: cleanerAddressMap[b.cleaner_id] ?? null,
    } satisfies BookingResult
  })
}
