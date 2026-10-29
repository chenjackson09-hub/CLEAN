import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROLE_HOME } from '@/lib/roleHome'
import type { UserRole } from '@/types/database'

const CUSTOMER_PATHS = ['/browse', '/bookings', '/home', '/cleaners', '/profile', '/chat']
const CLEANER_PATHS = ['/cleaner']
const ADMIN_PATHS = ['/admin']
// /cleaners/[id] is the one customer-facing page an admin also needs — the
// admin panel links a cleaner's row straight to the exact profile customers
// see, rather than a separate admin-styled mimic. Every other customer path
// (browse, bookings, home, profile) stays customer-only.
const ADMIN_READABLE_CUSTOMER_PATHS = ['/cleaners']

function matchesPath(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const hasSessionCookie = request.cookies.getAll().some((c) => c.name.includes('-auth-token'))

  let user = null
  if (hasSessionCookie) {
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
    } catch {
      user = null
    }
  }

  const { pathname } = request.nextUrl
  const isAuthPath = pathname === '/login' || pathname === '/register'
  const isOnboardingPath = pathname.startsWith('/register/')
  // Public post-logout screen — reachable without a session.
  const isSignedOutPath = pathname === '/signed-out'
  // OAuth callback must run while still unauthenticated (it sets the session).
  const isCallbackPath = pathname.startsWith('/auth/')
  // Read-only locality autocomplete — used on the registration screens, before
  // an account exists. Returns geography only.
  const isLocalitySearch = pathname === '/api/localities/search'

  if (!user && !isAuthPath && !isOnboardingPath && !isSignedOutPath && !isCallbackPath && !isLocalitySearch) {
    // Remember where they were headed (e.g. a booking link from a calendar event)
    // so sign-in can take them straight back. Validated again when it's used.
    const loginUrl = new URL('/login', request.url)
    const dest = pathname + request.nextUrl.search
    if (pathname !== '/') loginUrl.searchParams.set('next', dest)
    return NextResponse.redirect(loginUrl)
  }

  if (user) {
    const isRoleProtected =
      isAuthPath ||
      isOnboardingPath ||
      matchesPath(pathname, CLEANER_PATHS) ||
      matchesPath(pathname, CUSTOMER_PATHS) ||
      matchesPath(pathname, ADMIN_PATHS)

    let role: string | null = null
    if (isRoleProtected) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      role = profile?.role ?? null
    }

    const home = role ? (ROLE_HOME[role as UserRole] ?? '/login') : '/login'

    // The account exists from the first sign-up screen now, so a signed-in cleaner/host whose
    // sign-up isn't submitted yet belongs in THEIR wizard — and only there. Read in its own
    // query so an un-applied migration (no column) simply means "finished" and nothing breaks.
    let unfinished = false
    if ((isAuthPath || isOnboardingPath) && (role === 'cleaner' || role === 'customer')) {
      const { data: row, error: rowError } = await supabase
        .from('profiles')
        .select('onboarding_completed_at')
        .eq('id', user.id)
        .maybeSingle<{ onboarding_completed_at: string | null }>()
      unfinished = !rowError && !!row && row.onboarding_completed_at == null
    }

    // Fix 3: redirect authenticated users away from auth/onboarding pages only if they
    // already have a role — a null role means they're mid-registration and need to continue
    if ((isAuthPath || isOnboardingPath) && role) {
      if (unfinished) {
        const wizard = `/register/${role}`
        if (pathname !== wizard) return NextResponse.redirect(new URL(wizard, request.url))
        return supabaseResponse
      }
      return NextResponse.redirect(new URL(home, request.url))
    }

    // Fix 4: enforce role on all protected route groups
    if (matchesPath(pathname, CLEANER_PATHS) && role !== 'cleaner') {
      return NextResponse.redirect(new URL(home, request.url))
    }
    if (matchesPath(pathname, CUSTOMER_PATHS) && role !== 'customer') {
      const adminReadable = matchesPath(pathname, ADMIN_READABLE_CUSTOMER_PATHS) && role === 'admin'
      if (!adminReadable) return NextResponse.redirect(new URL(home, request.url))
    }
    if (matchesPath(pathname, ADMIN_PATHS) && role !== 'admin') {
      return NextResponse.redirect(new URL(home, request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
