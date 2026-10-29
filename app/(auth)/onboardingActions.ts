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

  // Independent reads, fetched together. `done` is isolated: if the column isn't there
  // (migration not applied) the sign-up is treated as finished.
  const [{ data: profile }, done] = await Promise.all([
    supabase.from('profiles').select('role, full_name, phone, avatar_url').eq('id', user.id).maybeSingle<{ role: string; full_name: string | null; phone: string | null; avatar_url: string | null }>(),
    supabase.from('profiles').select('onboarding_completed_at').eq('id', user.id).maybeSingle<{ onboarding_completed_at: string | null }>(),
  ])
  if (!profile || (profile.role !== 'cleaner' && profile.role !== 'customer')) return { error: 'This account does not have a sign-up to finish' }
  const role = profile.role as OnboardingRole
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

  // The role check and the place lookup do not depend on each other - run them together.
  // (Everything on this path is a network round trip, and the wizard waits for it.)
  const submit = input.submit === true
  const admin = createAdminClient()
  const opts = { submit, userId: user.id, supabaseUrl: SUPABASE_URL }
  const roleCheck = supabase.from('profiles').select('role').eq('id', user.id).maybeSingle<{ role: string }>()

  try {
    // Checked first, before anything is looked up or written.
    const draft = input.role === 'cleaner' ? validateCleanerDraft(input.draft, opts) : validateCustomerDraft(input.draft, opts)
    const typed = input.role === 'cleaner' ? (draft as CleanerDraft).loc : (draft as CustomerDraft).area
    const placeLookup = resolvePlace(admin, { localityId: draft.localityId, street: draft.localityId ? '' : typed, geocode: submit })
    const [{ data: profile }, place] = await Promise.all([roleCheck, placeLookup])

    // You can only save the sign-up of the role your account has.
    if (!profile || profile.role !== input.role) return { error: 'This sign-up belongs to a different account type.' }

    // Where they are now, so the next sign-in resumes here (best-effort).
    const step = Number.isInteger(input.step) ? Math.min(Math.max(input.step, 0), MAX_STEP) : 0
    const table = input.role === 'cleaner' ? 'cleaners' : 'customers'
    let row: Record<string, unknown>
    let profileRow: Record<string, unknown>
    let extras: Record<string, unknown> | null = null
    if (input.role === 'cleaner') {
      const rows = cleanerDraftToRows(draft as CleanerDraft, place)
      row = rows.cleaner
      profileRow = rows.profile
      if ((draft as CleanerDraft).experience) extras = rows.extras
    } else {
      const rows = customerDraftToRows(draft as CustomerDraft, place)
      row = rows.customer
      profileRow = rows.profile
    }

    // The two main writes touch different tables: together.
    const [p, c] = await Promise.all([
      supabase.from('profiles').update(profileRow).eq('id', user.id),
      supabase.from(table).upsert({ id: user.id, ...row }),
    ])
    if (p.error) throw p.error
    if (c.error) throw c.error

    // Everything left is best-effort (a missing column or a failed step note never fails the
    // sign-up), so it all runs at once instead of one round trip after another.
    const tail: PromiseLike<unknown>[] = []
    if (extras) {
      // Needs migration 0043.
      tail.push(supabase.from('cleaners').update(extras).eq('id', user.id).then((r) => { if (r.error) console.error('[onboarding] experience range not saved', r.error.message) }))
    }
    if (place.localityId) {
      tail.push(supabase.from(table).update({ locality_id: place.localityId }).eq('id', user.id).then((r) => { if (r.error) console.error('[onboarding] locality link not saved', r.error.message) }))
    }
    tail.push(supabase.auth.updateUser({ data: { onboarding_step: submit ? 0 : step } }).then((r) => { if (r.error) console.error('[onboarding] step not remembered', r.error.message) }))
    if (submit) {
      // The finish line: from now on admin sees this sign-up and can approve it.
      tail.push(supabase.from('profiles').update({ onboarding_completed_at: new Date().toISOString() }).eq('id', user.id).then((r) => { if (r.error) console.error('[onboarding] could not mark the sign-up finished', r.error.message) }))
    }
    await Promise.all(tail)
    return { ok: true }
  } catch (e) {
    if (e instanceof DraftError) return { error: e.message }
    console.error('[onboarding] save failed', e)
    return { error: 'Could not save. Please try again.' }
  }
}
