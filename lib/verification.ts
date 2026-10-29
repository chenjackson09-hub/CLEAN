import type { SupabaseClient } from '@supabase/supabase-js'
import { REQUIRE_VERIFIED_CONTACT } from '@/lib/features'

// The single place that decides whether someone may send a request (host) or accept one
// (cleaner) as far as VERIFIED CONTACT goes. Design: docs/verification-architecture.md.
//
//  - Switch off (today): everyone is eligible and nothing is read.
//  - Switch on: test accounts (profiles.is_test_account, true for everyone today) stay eligible,
//    so turning it on cannot lock the smoke-test users out. A real account needs at least one
//    verified row in `contact_methods` (not built yet). It FAILS CLOSED: if that cannot be
//    read, the person is asked to verify rather than silently let through.
//
// Returns null when allowed, or a short message to show the person.
export const CONTACT_NOT_VERIFIED_MESSAGE = 'Please confirm your email or phone number first.'

export async function contactVerificationBlock(admin: SupabaseClient, userId: string, enabled: boolean = REQUIRE_VERIFIED_CONTACT): Promise<string | null> {
  if (!enabled) return null
  try {
    const { data: profile } = await admin.from('profiles').select('is_test_account').eq('id', userId).maybeSingle<{ is_test_account: boolean | null }>()
    if (profile?.is_test_account) return null
    const { data, error } = await admin.from('contact_methods').select('id').eq('user_id', userId).not('verified_at', 'is', null).limit(1)
    if (error) return CONTACT_NOT_VERIFIED_MESSAGE
    return data && data.length > 0 ? null : CONTACT_NOT_VERIFIED_MESSAGE
  } catch {
    return CONTACT_NOT_VERIFIED_MESSAGE
  }
}
