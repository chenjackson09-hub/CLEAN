// Delete every non-admin account (hosts and cleaners) and what belongs to them.
//
//   node scripts/delete-test-users.mjs                 # DRY RUN: only lists what would go
//   node scripts/delete-test-users.mjs --delete        # really deletes (irreversible)
//   node scripts/delete-test-users.mjs --keep a@x.com,b@y.com   # also keep these emails
//   node scripts/delete-test-users.mjs --only a@x.com           # DRY RUN for just these people
//   node scripts/delete-test-users.mjs --only a@x.com --delete  # delete just them
//
// --only is the safe way to remove one person (e.g. someone who started signing up and changed
// their mind). It touches ONLY the listed emails, and refuses an admin, an account whose sign-up
// was already submitted (onboarding finished), or one whose state can't be read. It cannot be
// combined with --keep.
//
// Admin accounts are always kept. Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// from .env.local (or .env). Never prints keys.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'

function loadEnv() {
  const out = {}
  for (const f of ['../.env', '../.env.local']) {
    const u = new URL(f, import.meta.url)
    if (!existsSync(u)) continue
    for (const l of readFileSync(u, 'utf8').split('\n')) {
      if (!l.trim() || l.trim().startsWith('#') || !l.includes('=')) continue
      const i = l.indexOf('=')
      out[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    }
  }
  return out
}
const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const reallyDelete = process.argv.includes('--delete')
const keepIdx = process.argv.indexOf('--keep')
const keepEmails = new Set((keepIdx > -1 ? process.argv[keepIdx + 1] ?? '' : '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))

const onlyIdx = process.argv.indexOf('--only')
const onlyMode = onlyIdx > -1
const onlyEmails = new Set((onlyMode ? process.argv[onlyIdx + 1] ?? '' : '').split(',').map((s) => s.trim().toLowerCase()).filter((s) => s && !s.startsWith('--')))
if (onlyMode && onlyEmails.size === 0) { console.error('--only needs at least one email, e.g. --only a@x.com,b@y.com'); process.exit(1) }
if (onlyMode && keepIdx > -1) { console.error('--only and --keep can\'t be used together.'); process.exit(1) }

const sb = createClient(url, key, { auth: { persistSession: false } })

async function allAuthUsers() {
  const users = []
  for (let page = 1; ; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 1000) break
  }
  return users
}

async function listFolder(bucket, folder) {
  const { data } = await sb.storage.from(bucket).list(folder, { limit: 1000 })
  return (data ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`)
}

const users = await allAuthUsers()
const { data: profiles, error: pErr } = await sb.from('profiles').select('id, role, full_name')
if (pErr) throw pErr
const byId = new Map(profiles.map((p) => [p.id, p]))

// --only: which sign-ups are still unfinished? (null = not submitted). A read error means we can't
// tell, so nothing is deleted in that mode.
let unfinished = new Set(), unfinishedKnown = true
if (onlyMode) {
  const { data: rows, error } = await sb.from('profiles').select('id, onboarding_completed_at')
  if (error) { unfinishedKnown = false; console.error(`Can't read sign-up state (${error.message}) — refusing to delete anything with --only.`) }
  else unfinished = new Set(rows.filter((r) => r.onboarding_completed_at == null).map((r) => r.id))
}

const keep = [], doomed = [], refused = []
for (const u of users) {
  const p = byId.get(u.id)
  const email = (u.email ?? '').toLowerCase()
  if (onlyMode) {
    if (!onlyEmails.has(email)) continue
    if (p?.role === 'admin') refused.push({ u, p, why: 'is an admin' })
    else if (!unfinishedKnown) refused.push({ u, p, why: 'sign-up state could not be read' })
    else if (!unfinished.has(u.id)) refused.push({ u, p, why: 'sign-up was already submitted (finished)' })
    else doomed.push({ u, p })
    continue
  }
  if (p?.role === 'admin' || keepEmails.has(email)) keep.push({ u, p })
  else doomed.push({ u, p })
}
if (onlyMode) {
  const found = new Set(users.map((u) => (u.email ?? '').toLowerCase()))
  for (const e of onlyEmails) if (!found.has(e)) console.log(`Not found: ${e}`)
}

const row = ({ u, p }) => `${(p?.role ?? 'no-profile').padEnd(9)} ${(u.email ?? '(no email)').padEnd(34)} ${(p?.full_name ?? '').padEnd(24)} created ${u.created_at?.slice(0, 10)}`
if (!onlyMode) { console.log(`\nKEEP (${keep.length}):`); keep.forEach((x) => console.log('  ' + row(x))) }
if (onlyMode && refused.length) { console.log(`\nREFUSED (${refused.length}) — not deleted:`); refused.forEach((x) => console.log(`  ${row(x)}  <- ${x.why}`)) }
console.log(`\nDELETE (${doomed.length}):`); doomed.forEach((x) => console.log('  ' + row(x)))

const ids = doomed.map((x) => x.u.id)
const count = async (table, col) => {
  if (ids.length === 0) return 0
  const { count: c, error } = await sb.from(table).select('*', { count: 'exact', head: true }).in(col, ids)
  return error ? `? (${error.message.slice(0, 40)})` : c
}
console.log('\nRows that belong to them:')
for (const [t, c] of [['bookings', 'customer_id'], ['bookings', 'cleaner_id'], ['messages', 'sender_id'], ['notifications', 'user_id'], ['ratings', 'rater_id'], ['cleaner_availability', 'cleaner_id'], ['support_messages', 'user_id']]) {
  console.log(`  ${t}.${c}: ${await count(t, c)}`)
}
let files = 0
for (const id of ids) for (const b of ['avatars', 'gallery', 'home-photos']) files += (await listFolder(b, id)).length
console.log(`  storage files (avatars/gallery/home-photos): ${files}`)

if (onlyMode && doomed.length === 0) { console.log('\nNothing to delete.\n'); process.exit(0) }
if (!reallyDelete) { console.log('\nDRY RUN — nothing was deleted. Re-run with --delete to remove the accounts above.\n'); process.exit(0) }

console.log('\nDeleting…')
// 1) things that point at these people and would otherwise block the delete
const stepsByCol = [['bookings', 'customer_id'], ['bookings', 'cleaner_id']]
for (const [t, c] of stepsByCol) {
  const { error } = await sb.from(t).delete().in(c, ids)
  if (error) console.log(`  ${t}.${c}: ${error.message}`)
}
// 2) storage
for (const id of ids) for (const b of ['avatars', 'gallery', 'home-photos']) {
  const paths = await listFolder(b, id)
  if (paths.length) await sb.storage.from(b).remove(paths)
}
// 3) the accounts (profile + role rows cascade from the auth user)
let ok = 0
for (const { u } of doomed) {
  const { error } = await sb.auth.admin.deleteUser(u.id)
  if (error) console.log(`  FAILED ${u.email}: ${error.message}`)
  else ok++
}
console.log(`Deleted ${ok} of ${doomed.length} accounts.\n`)
