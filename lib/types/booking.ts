export type BookingStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled'

export type BookingResult = {
  id: string
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
  customer_name?: string
  cleaner_email?: string
  cleaner_phone?: string
  customer_email?: string
  customer_phone?: string
}
