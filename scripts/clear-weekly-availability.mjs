// Reset every cleaner's recurring weekly availability to none by deleting all
// rows from cleaner_weekly_availability. Each row is a single weekly slot and
// its time columns are NOT NULL, so "none" means removing the rows entirely.
// Per-date availability (cleaner_availability) is left untouched.
//
//   node scripts/clear-weekly-availability.mjs            # delete all weekly slots
//   node scripts/clear-weekly-availability.mjs --dry-run  # show how many would be deleted
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env. Uses the
// service role so it bypasses RLS and clears every cleaner's rows, not just one.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')
const sb = createClient(url, key)

const { count, error: countErr } = await sb
  .from('cleaner_weekly_availability')
  .select('*', { count: 'exact', head: true })

if (countErr) {
  console.error('Failed to count weekly availability rows:', countErr.message)
  process.exit(1)
}

console.log(`${count ?? 0} weekly availability slot(s) found${dryRun ? ' (dry run)' : ''}`)

if (!count) {
  console.log('Nothing to delete.')
  process.exit(0)
}

if (dryRun) {
  console.log(`Would delete all ${count} slot(s).`)
  process.exit(0)
}

// id is a NOT NULL uuid primary key, so "id is not null" matches every row —
// Supabase requires a filter on delete, this is the all-rows form.
const { error: delErr } = await sb
  .from('cleaner_weekly_availability')
  .delete()
  .not('id', 'is', null)

if (delErr) {
  console.error('Delete failed:', delErr.message)
  process.exit(1)
}

console.log(`Done. Deleted ${count} weekly availability slot(s).`)
