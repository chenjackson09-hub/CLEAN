import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ROLE_HOME } from '@/lib/roleHome'
import type { UserRole } from '@/types/database'

// OAuth (Google) redirect target. Supabase sends the user here with a `code`;
// we exchange it for a session cookie, then route by role. New Google users get
// a `customer` profile from the handle_new_user trigger (no role metadata is
// passed for OAuth), so they land on /browse.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const oauthError = url.searchParams.get('error_description') ?? url.searchParams.get('error')

  if (oauthError) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(oauthError)}`, url.origin))
  }

  const supabase = await createClient()
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin))
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let dest = '/login'
  if (user) {
    // A Google-only user who hasn't finished onboarding picks a role first.
    const providers: string[] = user.app_metadata?.providers ?? []
    const isGoogleOnly = providers.includes('google') && !providers.includes('email')
    if (isGoogleOnly && user.user_metadata?.onboarded !== true) {
      return NextResponse.redirect(new URL('/onboarding', url.origin))
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role as UserRole | undefined
    dest = role ? ROLE_HOME[role] ?? '/browse' : '/browse'
  }
  return NextResponse.redirect(new URL(dest, url.origin))
}
