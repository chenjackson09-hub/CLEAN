// Host home photos: PRIVATE photos a host can add so a cleaner sees what the job is like.
// They live in the private `home-photos` storage bucket (migration 0044) under "<host id>/",
// and are only ever shown through short-lived signed links the server creates after checking
// who is asking. Nothing here is public.

export const HOME_PHOTOS_BUCKET = 'home-photos'
export const MAX_HOME_PHOTOS = 6
// Signed links last an hour: long enough to look at the page, short enough not to be shared.
export const HOME_PHOTO_URL_SECONDS = 60 * 60

const FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i

// A path is acceptable only if it is "<this person's id>/<uuid>.<image extension>" - so nobody
// can register (or ask the server to sign) a file in somebody else's folder, or any other path.
export function isOwnHomePhotoPath(path: unknown, userId: string): path is string {
  if (typeof path !== 'string' || path.length > 200) return false
  const [folder, file, ...rest] = path.split('/')
  return rest.length === 0 && folder === userId && !!file && FILE.test(file)
}

// Who may see a host's home photos: a cleaner with a LIVE request from that host. A request
// that was declined, cancelled or has run out unanswered does not count, so the access ends
// with the request.
export type PhotoViewerBooking = { status: string; response_deadline?: string | null }

export function cleanerMaySeeHomePhotos(bookings: PhotoViewerBooking[], now: Date = new Date()): boolean {
  return bookings.some((b) => {
    if (b.status === 'accepted' || b.status === 'completed') return true
    if (b.status === 'pending') return !b.response_deadline || new Date(b.response_deadline) > now
    return false
  })
}
