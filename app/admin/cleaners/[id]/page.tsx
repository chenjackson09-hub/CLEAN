import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { AdminCleanerProfile } from './AdminCleanerProfile'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'

// Shared detail page for a single cleaner, reached from either the Cleaners
// list or the Applications list — one page regardless of whether they're
// still pending review or already approved, so the same "click a row to see
// their profile" behavior works from both places.
export default async function AdminCleanerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  noStore()
  const { id } = await params
  const admin = createAdminClient()

  const [{ data: profile }, { data: cleaner }, { data: applications }, authRes] = await Promise.all([
    admin.from('profiles').select('full_name, avatar_url, phone').eq('id', id).single(),
    admin
      .from('cleaners')
      .select('status, hourly_rate, rating_avg, rating_count, cleans_completed, bio, address')
      .eq('id', id)
      .single(),
    admin
      .from('cleaner_applications')
      .select('id, status, submitted_at, reviewed_at, id_document_url, admin_notes')
      .eq('cleaner_id', id)
      .order('submitted_at', { ascending: false })
      .limit(1),
    admin.auth.admin.getUserById(id),
  ])

  if (!profile || !cleaner) notFound()

  const application = applications?.[0] ?? null

  return (
    <div className="px-6 py-6">
      <AdminCleanerProfile
        cleanerId={id}
        fullName={profile.full_name ?? ''}
        avatarUrl={profile.avatar_url ?? null}
        email={authRes.data?.user?.email ?? ''}
        phone={profile.phone ?? ''}
        hourlyRate={cleaner.hourly_rate ?? 0}
        ratingAvg={cleaner.rating_avg ?? null}
        ratingCount={cleaner.rating_count ?? 0}
        cleansCompleted={cleaner.cleans_completed ?? 0}
        cleanerStatus={cleaner.status}
        address={cleaner.address ?? ''}
        application={
          application
            ? {
                id: application.id,
                status: application.status,
                submittedAt: application.submitted_at,
                reviewedAt: application.reviewed_at,
                idDocumentUrl: application.id_document_url,
                adminNotes: application.admin_notes,
              }
            : null
        }
      />
    </div>
  )
}
