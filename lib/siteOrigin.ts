// The public address of the site, for links that leave the app (emails).
// A localhost value (left over from development) must never end up in someone's inbox, so only
// a real public URL is trusted; on Vercel the project's production address is the fallback.
// Returns null when neither is known — callers then leave the links out.
const LOCAL = /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/i

export function publicOrigin(env: Record<string, string | undefined> = process.env): string | null {
  const raw = (env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '')
  if (raw && /^https?:\/\//i.test(raw) && !LOCAL.test(raw)) return raw
  const prod = (env.VERCEL_PROJECT_PRODUCTION_URL ?? '').trim().replace(/\/+$/, '')
  if (prod) return /^https?:\/\//i.test(prod) ? prod : `https://${prod}`
  return null
}
