'use server'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { HOME_PHOTOS_BUCKET, HOME_PHOTO_URL_SECONDS, MAX_HOME_PHOTOS, isOwnHomePhotoPath } from '@/lib/homePhotos'

// A host's own home photos (private bucket, migration 0044). The browser uploads the file
// straight to the host's own folder; these actions register it on the profile, list it back with
// short-lived signed links, and remove it. The host is always taken from the session.

export type HomePhoto = { path: string; url: string }
type Result = { ok: true; photos: HomePhoto[] } | { error: string }

async function readPaths(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<{ paths: string[]; ok: boolean }> {
  const { data, error } = await supabase.from('customers').select('home_photos').eq('id', userId).maybeSingle<{ home_photos: string[] | null }>()
  if (error) return { paths: [], ok: false }
  return { paths: (data?.home_photos ?? []).filter((p) => isOwnHomePhotoPath(p, userId)), ok: true }
}

async function sign(supabase: Awaited<ReturnType<typeof createClient>>, paths: string[]): Promise<HomePhoto[]> {
  if (paths.length === 0) return []
  const { data } = await supabase.storage.from(HOME_PHOTOS_BUCKET).createSignedUrls(paths, HOME_PHOTO_URL_SECONDS)
  const urlByPath = new Map((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path as string, d.signedUrl]))
  return paths.flatMap((p) => (urlByPath.has(p) ? [{ path: p, url: urlByPath.get(p) as string }] : []))
}

// Fails open: if the column or bucket isn't there yet (migration not applied) the host simply
// sees no photos.
export async function listMyHomePhotos(): Promise<Result> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Please sign in again.' }
  const supabase = await createClient()
  const { paths } = await readPaths(supabase, user.id)
  return { ok: true, photos: await sign(supabase, paths) }
}

// Registers a file the browser has just uploaded. The file must already exist in the host's own
// folder (signing it proves that), and a host can have at most MAX_HOME_PHOTOS.
export async function addHomePhoto(path: string): Promise<Result> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Please sign in again.' }
  if (!isOwnHomePhotoPath(path, user.id)) return { error: 'That photo could not be added.' }
  const supabase = await createClient()

  const current = await readPaths(supabase, user.id)
  if (!current.ok) return { error: 'Photos are not available yet. Please try again later.' }
  if (!current.paths.includes(path)) {
    if (current.paths.length >= MAX_HOME_PHOTOS) return { error: `You can add up to ${MAX_HOME_PHOTOS} photos.` }
    const signed = await sign(supabase, [path])
    if (signed.length === 0) return { error: 'That photo could not be added.' }
    const { error } = await supabase.from('customers').update({ home_photos: [...current.paths, path] }).eq('id', user.id)
    if (error) return { error: 'Could not save the photo. Please try again.' }
  }
  const after = await readPaths(supabase, user.id)
  return { ok: true, photos: await sign(supabase, after.paths) }
}

export async function removeHomePhoto(path: string): Promise<Result> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Please sign in again.' }
  if (!isOwnHomePhotoPath(path, user.id)) return { error: 'That photo could not be removed.' }
  const supabase = await createClient()

  const current = await readPaths(supabase, user.id)
  if (!current.ok) return { error: 'Photos are not available yet. Please try again later.' }
  const { error } = await supabase.from('customers').update({ home_photos: current.paths.filter((p) => p !== path) }).eq('id', user.id)
  if (error) return { error: 'Could not remove the photo. Please try again.' }
  // The file itself goes too (best-effort: the profile no longer points at it either way).
  const { error: rmErr } = await createAdminClient().storage.from(HOME_PHOTOS_BUCKET).remove([path])
  if (rmErr) console.error('[home photos] file not deleted', rmErr.message)
  const after = await readPaths(supabase, user.id)
  return { ok: true, photos: await sign(supabase, after.paths) }
}
