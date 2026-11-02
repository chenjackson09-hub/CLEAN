import type { SupabaseClient } from '@supabase/supabase-js'
import { HOME_PHOTOS_BUCKET, HOME_PHOTO_URL_SECONDS, cleanerMaySeeHomePhotos, isOwnHomePhotoPath, type PhotoViewerBooking } from '@/lib/homePhotos'

// The signed links to a host's home photos for ONE cleaner. `admin` is the service-role client
// (the bucket has no policy for anyone but the host). Returns nothing unless this cleaner has a
// live request from the host - the caller passes the cleaner's own bookings with that host, so
// there is no way to ask for photos by id alone. FAILS OPEN to "no photos".
export async function homePhotoLinksForCleaner(admin: SupabaseClient, hostId: string, bookingsWithHost: PhotoViewerBooking[]): Promise<string[]> {
  if (!cleanerMaySeeHomePhotos(bookingsWithHost)) return []
  try {
    const { data, error } = await admin.from('customers').select('home_photos').eq('id', hostId).maybeSingle<{ home_photos: string[] | null }>()
    if (error) return []
    const paths = (data?.home_photos ?? []).filter((p) => isOwnHomePhotoPath(p, hostId))
    if (paths.length === 0) return []
    const { data: signed } = await admin.storage.from(HOME_PHOTOS_BUCKET).createSignedUrls(paths, HOME_PHOTO_URL_SECONDS)
    const byPath = new Map((signed ?? []).filter((s) => s.signedUrl && s.path).map((s) => [s.path as string, s.signedUrl]))
    return paths.flatMap((p) => (byPath.has(p) ? [byPath.get(p) as string] : []))
  } catch {
    return []
  }
}
