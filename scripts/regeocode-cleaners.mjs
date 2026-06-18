// Recompute cleaners.location from cleaners.address for every cleaner that has
// an address saved. Use after the geocoding bias changes, or to backfill points
// that were stored with the old (unbiased, sometimes wrong) geocoder.
//
//   node scripts/regeocode-cleaners.mjs            # update rows
//   node scripts/regeocode-cleaners.mjs --dry-run  # show what would change
//
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (and the optional
// GEOCODE_COUNTRY_CODES / GEOCODE_LANGUAGE) from .env.

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

const COUNTRY = env.GEOCODE_COUNTRY_CODES ?? 'il'
const LANGUAGE = env.GEOCODE_LANGUAGE ?? 'he'
const dryRun = process.argv.includes('--dry-run')

async function geocode(address) {
  const params = new URLSearchParams({ format: 'json', limit: '1', q: address })
  if (COUNTRY) params.set('countrycodes', COUNTRY)
  if (LANGUAGE) params.set('accept-language', LANGUAGE)
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'Clean-App' },
  })
  if (!res.ok) return null
  const r = await res.json()
  if (!Array.isArray(r) || !r.length) return null
  const lat = parseFloat(r[0].lat)
  const lng = parseFloat(r[0].lon)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

const sb = createClient(url, key)
const { data: cleaners, error } = await sb
  .from('cleaners')
  .select('id, address')
  .not('address', 'is', null)

if (error) {
  console.error('Failed to read cleaners:', error.message)
  process.exit(1)
}

const withAddress = (cleaners ?? []).filter((c) => c.address && c.address.trim())
console.log(`${withAddress.length} cleaner(s) with an address${dryRun ? ' (dry run)' : ''}\n`)

let updated = 0
let failed = 0
for (const c of withAddress) {
  const point = await geocode(c.address)
  if (!point) {
    console.log(`  ✗ ${c.id.slice(0, 8)}  "${c.address}" — could not geocode`)
    failed++
  } else {
    console.log(`  ✓ ${c.id.slice(0, 8)}  "${c.address}" → ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`)
    if (!dryRun) {
      const { error: upErr } = await sb
        .from('cleaners')
        .update({ location: `POINT(${point.lng} ${point.lat})` })
        .eq('id', c.id)
      if (upErr) {
        console.log(`     update failed: ${upErr.message}`)
        failed++
        continue
      }
    }
    updated++
  }
  // Respect Nominatim's 1 request/second usage policy.
  await new Promise((r) => setTimeout(r, 1100))
}

console.log(`\nDone. ${updated} ${dryRun ? 'would be updated' : 'updated'}, ${failed} failed.`)
