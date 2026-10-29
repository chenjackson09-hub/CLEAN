'use server'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLocality, resolvePlace } from '@/lib/localities/resolve'
import type { PickedLocality } from '@/lib/localities/address'
import { DraftError } from '@/lib/onboarding/validate'
import { cleanerDraftToRows, cleanerRowsToDraft, validateCleanerDraft, type CleanerDraft } from '@/lib/onboarding/cleaner'
import { customerDraftToRows, customerRowsToDraft, validateCustomerDraft, type CustomerDraft } from '@/lib/onboarding/customer'

export type OnboardingRole = 'cleaner' | 'customer'

export type OnboardingState =
  | { error: string }
  | {
      role: OnboardingRole
      // Where to resume (0-based). 0 for a brand-new account.
      step: number
      // True when the sign-up was already submitted (or the migration isn't applied): the
      // wizard then sends the person to their home instead of showing the questions again.
      completed: boolean
      draft: CleanerDraft | CustomerDraft
      locality: PickedLocality | null
    }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const MAX_STEP = 40

// Loads this person's sign-up answers from what is already saved, so they continue exactly
// where they stopped — on any device.
export async function loadOnboarding(): Promise<OnboardingState> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Not signed in' }
  const supabase = await createClient()

  const { data: profile } = await supabase.from('profiles').select('role, full_name, phone, avatar_url').eq('id', user.id).maybeSingle<{ role: string; full_name: string | null; phone: string | null; avatar_url: string | null }>()
  if (!profile || (profile.role !== 'cleaner' && profile.role !== 'customer')) return { error: 'This account does not have a sign-up to finish' }
  const role = profile.role as OnboardingRole

  // Isolated: if the column isn't there (migration not applied) treat the sign-up as finished.
  const done = await supabase.from('profiles').select('onboarding_completed_at').eq('id', user.id).maybeSingle<{ onboarding_completed_at: string | null }>()
  const completed = !!done.error || !!done.data?.onboarding_completed_at

  const table = role === 'cleaner' ? 'cleaners' : 'customers'
  const { data: row } = await supabase.from(table).select('*').eq('id', user.id).maybeSingle<Record<string, unknown>>()
  const draft = role === 'cleaner' ? cleanerRowsToDraft(profile, row) : customerRowsToDraft(profile, row)
  const localityId = (draft as { localityId: string | null }).localityId
  const locality = localityId ? await getLocality(createAdminClient(), localityId) : null

  const rawStep = user.user_metadata?.onboarding_step
  const step = Number.isInteger(rawStep) && rawStep >= 0 && rawStep <= MAX_STEP ? (rawStep as number) : 0
  return { role, step, completed, draft, locality }
}

// Saves what the wizard has so far (every Continue) or, with submit, the final answers —
// which are checked again here on the server, not only in the browser.
export async function saveOnboarding(input: { role: OnboardingRole; draft: unknown; step: number; submit: boolean }): Promise<{ ok: true } | { error: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Please sign in again.' }
  if (input?.role !== 'cleaner' && input?.role !== 'customer') return { error: 'Something went wrong. Please try again.' }
  const supabase = await createClient()

  // You can only save the sign-up of the role your account has.
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle<{ role: string }>()
  if (!profile || profile.role !== input.role) return { error: 'This sign-up belongs to a different account type.' }

  try {
    const submit = input.submit === true
    const admin = createAdminClient()
    const opts = { submit, userId: user.id, supabaseUrl: SUPABASE_URL }

    if (input.role === 'cleaner') {
      const draft = validateCleanerDraft(input.draft, opts)
      const place = await resolvePlace(admin, { localityId: draft.localityId, street: draft.localityId ? '' : draft.loc })
      const rows = cleanerDraftToRows(draft, place)
      const p = await supabase.from('profiles').update(rows.profile).eq('id', user.id)
      if (p.error) throw p.error
      const c = await supabase.from('cleaners').upsert({ id: user.id, ...rows.cleaner })
      if (c.error) throw c.error
      if (place.localityId) {
        // Its own best-effort write, as before: a missing column never fails the sign-up.
        const link = await supabase.from('cleaners').update({ locality_id: place.localityId }).eq('id', user.id)
        if (link.error) console.error('[onboarding] locality link not saved', link.error.message)
      }
    } else {
      const draft = validateCustomerDraft(input.draft, opts)
      const place = await resolvePlace(admin, { localityId: draft.localityId, street: draft.localityId ? '' : draft.area })
      const rows = customerDraftToRows(draft, place)
      const p = await supabase.from('profiles').update(rows.profile).eq('id', user.id)
      if (p.error) throw p.error
      const c = await supabase.from('customers').upsert({ id: user.id, ...rows.customer })
      if (c.error) throw c.error
      if (place.localityId) {
        const link = await supabase.from('customers').update({ locality_id: place.localityId }).eq('id', user.id)
        if (link.error) console.error('[onboarding] locality link not saved', link.error.message)
      }
    }

    // Where they are now, so the next sign-in resumes here (best-effort).
    const step = Number.isInteger(input.step) ? Math.min(Math.max(input.step, 0), MAX_STEP) : 0
    const meta = await supabase.auth.updateUser({ data: { onboarding_step: submit ? 0 : step } })
    if (meta.error) console.error('[onboarding] step not remembered', meta.error.message)

    if (submit) {
      // The finish line: from now on admin sees this sign-up and can approve it.
      const done = await supabase.from('profiles').update({ onboarding_completed_at: new Date().toISOString() }).eq('id', user.id)
      if (done.error) console.error('[onboarding] could not mark the sign-up finished', done.error.message)
    }
    return { ok: true }
  } catch (e) {
    if (e instanceof DraftError) return { error: e.message }
    console.error('[onboarding] save failed', e)
    return { error: 'Could not save. Please try again.' }
  }
}
