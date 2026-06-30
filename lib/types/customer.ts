export type CustomerResult = {
  id: string
  full_name: string
  email: string
  phone: string
  address: string
  // Average rating out of 5 received from cleaners (null when never rated) and
  // how many ratings. See migration 0011.
  rating_avg?: number | null
  rating_count?: number
}
