export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'needs_info'

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
  id_document_url: string | null
  admin_notes: string | null
}
