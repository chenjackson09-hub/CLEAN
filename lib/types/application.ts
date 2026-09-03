export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'needs_info'

export type ApplicationCategory = 'cleaner' | 'customer'

// One row of the admin "All Applications" list — cleaner applications and
// customer signups both get normalized into this shape (see
// app/admin/applications/page.tsx) so ApplicationsList can render either
// kind with one component. `id` is the review-record id (cleaner_applications.id
// for cleaners; customers has no separate applications table, so it's just
// customers.id) — `personId` is always the person's own account id, used for
// the public-profile link and for the approve/reject/notes action calls.
export type UnifiedApplication = {
  id: string
  category: ApplicationCategory
  personId: string
  full_name: string
  avatar_url: string | null
  email: string
  phone: string
  hourly_rate: number | null
  address: string
  status: ApplicationStatus
  submitted_at: string
  reviewed_at: string | null
  id_document_url: string | null
  admin_notes: string | null
  cleans_completed: number
}

export type CleanerApplicationResult = {
  id: string
  full_name: string
  avatar_url: string | null
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
  reviewed_at: string | null
  id_document_url: string | null
  admin_notes: string | null
  cleans_completed: number
}
