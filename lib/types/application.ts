export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export type CleanerApplicationResult = {
  id: string
  full_name: string
  email: string
  phone: string
  bio: string
  service_types: ('residential' | 'commercial')[]
  hourly_rate: number
  years_experience: number
  languages: string[]
  address: string
  status: ApplicationStatus
  submitted_at: string
}
