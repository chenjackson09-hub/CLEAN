export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'

export type BookingResult = {
  id: string
  // The booked cleaner's user id, used to link to their profile from /bookings.
  // Optional because the admin/mock views build results without it.
  cleaner_id?: string
  cleaner_name: string
  cleaner_avatar_url: string | null
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
}
