import type { SupabaseClient } from '@supabase/supabase-js'

// People who created an account but haven't submitted their sign-up wizard yet
// (profiles.onboarding_completed_at is null). They aren't applications yet — the
// admin sees them on their own "Unfinished" tab and they never count toward
// pending-review totals or sidebar badges.
//
// FAILS OPEN: any error (e.g. migration 0042 not applied) returns an empty set, so
// every account reads as finished and nothing disappears from an admin screen.
export async function fetchUnfinishedIds(admin: SupabaseClient): Promise<Set<string>> {
  const out = new Set<string>()
  try {
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .is('onboarding_completed_at', null)
      .in('role', ['cleaner', 'customer'])
      .limit(5000)
    if (error) return out
    for (const r of (data ?? []) as { id: string }[]) out.add(r.id)
  } catch {
    /* treat everyone as finished */
  }
  return out
}

// Has THIS person not submitted their sign-up wizard yet? Uses the person's own
// (RLS-scoped) client. Fails open: any error reads as "finished", so the banner
// simply doesn't show instead of breaking a layout.
export async function isOwnSignupUnfinished(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed_at')
      .eq('id', userId)
      .maybeSingle<{ onboarding_completed_at: string | null }>()
    return !error && !!data && data.onboarding_completed_at == null
  } catch {
    return false
  }
}
