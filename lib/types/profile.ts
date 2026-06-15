export type CustomerProfile = {
  full_name: string
  phone: string
  bio: string
  preferred_service_type: 'residential' | 'commercial' | 'both'
  address: string
  avatar_url: string | null
}
