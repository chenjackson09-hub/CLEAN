// Quiet auto-refresh: every couple of minutes the signed-in pages ask the server for fresh data
// (router.refresh keeps the page, scroll position and anything typed; it only re-reads data).

export const AUTO_REFRESH_MS = 2 * 60 * 1000

// Pages that already update live (chat uses Supabase realtime) or that are mid-form.
const SKIP_PREFIXES = ['/chat', '/cleaner/chat', '/register', '/onboarding']

export function isAutoRefreshPath(pathname: string | null): boolean {
  if (!pathname) return false
  return !SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

/** True when the person is in the middle of typing/choosing something. */
export function isTypingTarget(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type
    return !['button', 'submit', 'checkbox', 'radio', 'range', 'reset', 'image'].includes(type)
  }
  return (el as HTMLElement).isContentEditable === true
}

export function shouldAutoRefresh(state: {
  hidden: boolean
  online: boolean
  pathname: string | null
  activeElement: Element | null
}): boolean {
  if (state.hidden || !state.online) return false
  if (!isAutoRefreshPath(state.pathname)) return false
  return !isTypingTarget(state.activeElement)
}
