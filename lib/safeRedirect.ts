// Where to send someone after they sign in when they were first stopped at a page
// that needed a login (e.g. a booking link from a calendar event). Only a plain
// same-site path is ever accepted — never another site, a protocol-relative URL,
// or the login/register pages themselves.
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (v.length === 0 || v.length > 500) return null
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return null
  if (/[\u0000-\u001f]/.test(v)) return null
  const path = v.split(/[?#]/)[0]
  if (path === '/login' || path.startsWith('/register') || path.startsWith('/auth/') || path === '/signed-out') return null
  return v
}

export const POST_LOGIN_COOKIE = 'post_login_next'
