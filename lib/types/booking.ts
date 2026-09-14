export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'

export type BookingResult = {
  id: string
  // The booked cleaner's user id, used to link to their profile from /bookings.
  // Optional because the admin/mock views build results without it.
  cleaner_id?: string
  cleaner_name: string
  cleaner_avatar_url: string | null
  // Optional — populated by the admin Booking Requests/Matches lists so a
  // customer's name+avatar can render the same way a cleaner's does (see
  // app/admin/bookingsData.ts). Not used by the customer/cleaner-facing views.
  customer_id?: string
  customer_avatar_url?: string | null
  service_type: 'residential' | 'commercial'
  scheduled_date: string // 'YYYY-MM-DD'
  scheduled_start: string // 'HH:MM'
  duration_hours: number
  address: string
  notes?: string
  status: BookingStatus
  // True when the cleaner edited this booking (time / duration / note) after it
  // was created — drives the "updated by the cleaner" indicator on the card.
  cleaner_modified?: boolean
  // True when the customer booked with a flexible ("Not sure") duration — shows
  // a "Not sure" marker next to the duration. See migration 0009.
  duration_flexible?: boolean
  // True once the customer has dismissed this declined/cancelled booking from
  // their "Refused & cancelled" list ("Mark as seen") — such rows are filtered out.
  customer_ack_inactive?: boolean
  // The score the customer already gave the cleaner for this (completed) booking
  // (null/undefined = not yet rated). Seeds the rating control in the detail
  // modal. See migration 0011.
  my_rating?: number | null
  customer_name?: string
  cleaner_email?: string
  cleaner_phone?: string
  customer_email?: string
  customer_phone?: string
  // Admin-only display flag: still `pending` and scheduled_date has already
  // passed. Computed fresh per request in app/admin/bookingsData.ts — never
  // stored, since there's no 'expired' value in the bookings.status enum.
  expired?: boolean
  // Shared admin "seen/unseen" worklist flag (migration 0024). See
  // app/admin/seenItems.ts. Optional because non-admin views never set it.
  seen?: boolean
  // Booking-specific fields for the redesigned request card (migration 0029) —
  // see types/database.ts's Booking for the full backstory. Optional here
  // since older call sites/tests don't set them.
  cleaning_type?: 'regular' | 'deep' | null
  extras?: string[]
  pets_present?: boolean | null
  host_present?: boolean | null
  // The booked cleaner's hourly rate, for the summary's "Estimated total" —
  // and the requesting customer's live home/pet snapshot, for the summary's
  // "Your home"/"Pets" rows. Both attached by whichever fetch built this
  // result (lib/customerBookings.ts, app/admin/bookingsData.ts) so every
  // reader can build a full BookingRequestSummary without a second query.
  hourly_rate?: number | null
  home_info?: import('@/lib/bookingSummary').CustomerHomeInfo | null
}
