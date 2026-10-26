/* eslint-disable no-console */
// Sets up the Northern Hula Valley service area (needs migration 0041).
//
//   npm run seed:hula             dry run: print exactly what would change, write nothing
//   npm run seed:hula -- --write  apply it
//
// What it does (and ONLY this):
//   1. Sets the English DISPLAY spelling for the region's localities ("Beit Hillel").
//      The official CBS spelling in `name_en` is never touched.
//   2. Adds extra search spellings (aliases) such as "Kfar Yuval" or "Snir".
//   3. Creates the region "Northern Hula Valley" — CLOSED — and assigns its localities.
//      It never opens anything and never overrides a locality's own setting.
//   4. Links existing profiles to a locality ONLY when their saved address is exactly
//      one locality's name (nothing is guessed; ambiguous or unmatched ones are listed).
// Safe to re-run: every step is an upsert / "only if missing".
import { createClient } from '@supabase/supabase-js'
import { normalizeEn, normalizeHe } from '../lib/localities/normalize'
import { aliasKey } from '../lib/localities/search'

const WRITE = process.argv.includes('--write')
const REGION = 'Northern Hula Valley'

// official CBS code → [display spelling, extra search spellings]
const PLACES: Record<number, [string, string[]]> = {
  322: ['Beit Hillel', []],
  2800: ['Kiryat Shmona', ['Kiryat Shemona', 'Qiryat Shmona']],
  43: ['Metula', []],
  2009: ['Kfar Yuval', ['Yuval', 'כפר יובל']],
  416: ["Ma'ayan Baruch", ['Maayan Baruch', 'Maayan Barukh', 'מעין ברוך']],
  76: ['Kfar Giladi', ['Kfar Gil’adi']],
  356: ['HaGoshrim', ['Hagoshrim', 'Ha Goshrim']],
  302: ['Dafna', []],
  324: ["She'ar Yashuv", ['Shear Yashuv', 'Shaar Yashuv']],
  1132: ['Snir', ['Senir', 'סניר']],
  303: ['Dan', ['Kibbutz Dan']],
  366: ['Shamir', []],
  357: ['Kfar Blum', ['Kfar Bloom']],
  408: ['Neot Mordechai', ['Neot Mordekhay', 'Ne’ot Mordechai']],
  329: ['Sde Nehemia', ['Sdeh Nehemya', 'Sede Nehemia']],
  319: ['Amir', []],
  380: ['Lehavot HaBashan', ['Lahavot HaBashan']],
  852: ['Gonen', []],
  35: ['Gadot', []],
  253: ['Hulata', []],
  29: ["Yesud HaMa'ala", ['Yesod HaMaala', 'Yesud HaMaala']],
  77: ['Ayelet HaShahar', ['Ayyelet HaShahar']],
  26: ['Rosh Pina', ['Rosh Pinna']],
  378: ['Misgav Am', []],
  843: ['Margaliot', ['Margaliyyot']],
  347: ['Menara', []],
  345: ['Kfar Szold', ['Kefar Szold', 'Kfar Sold']],
  453: ['Yiftah', ['Yiftach']],
  372: ['Ramot Naftali', []],
  596: ['Malkiya', ['Malkiyya']],
  2063: ['Dishon', []],
  861: ["Sde Eli'ezer", ['Sde Eliezer', 'Sede Eli’ezer']],
  732: ['Mishmar HaYarden', []],
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local)')
  const db = createClient(url, key, { auth: { persistSession: false } })
  console.log(WRITE ? 'MODE: WRITE' : 'MODE: dry run (nothing is written)')

  const { data: locs, error } = await db
    .from('localities').select('id, cbs_code, name_he, name_en, name_en_display, search_he, search_en')
    .in('cbs_code', Object.keys(PLACES).map(Number))
  if (error) throw new Error(`${error.message} — has migration 0041 been applied?`)
  const byCode = new Map((locs ?? []).map((l) => [l.cbs_code as number, l]))
  const missing = Object.keys(PLACES).map(Number).filter((c) => !byCode.has(c))
  if (missing.length) throw new Error(`Official codes not found in localities: ${missing.join(', ')}`)

  // 1 + 2 ── display spelling and aliases
  console.log('\n[1/4] English display spelling + extra search spellings')
  for (const [code, [display, extras]] of Object.entries(PLACES)) {
    const l = byCode.get(Number(code))!
    console.log(`  ${String(code).padStart(4)}  ${l.name_he.padEnd(16)} official "${l.name_en}"  →  shown as "${display}"${extras.length ? `   (+ search: ${extras.join(', ')})` : ''}`)
    if (!WRITE) continue
    const { error: e1 } = await db.from('localities').update({ name_en_display: display }).eq('id', l.id)
    if (e1) throw e1
    const rows = extras
      .map((a) => ({ locality_id: l.id, alias: a, alias_search: aliasKey(a), lang: /[֐-׿]/.test(a) ? 'he' : 'en', source: 'admin' }))
      .filter((r) => r.alias_search && r.alias_search !== l.search_he && !(l.search_en ?? '').split(' | ').includes(r.alias_search))
    if (rows.length) {
      const { error: e2 } = await db.from('locality_aliases').upsert(rows, { onConflict: 'locality_id,alias_search', ignoreDuplicates: true })
      if (e2) throw e2
    }
  }

  // 3 ── region (closed) + members
  console.log(`\n[2/4] Region "${REGION}" (created CLOSED; ${Object.keys(PLACES).length} localities)`)
  const { data: existing } = await db.from('service_regions').select('id, is_active').eq('name', REGION).maybeSingle()
  console.log(existing ? `  already exists (${existing.is_active ? 'OPEN' : 'closed'}) — left as is` : '  will be created, closed')
  let regionId = existing?.id as string | undefined
  if (WRITE) {
    if (!regionId) {
      const { data: created, error: e3 } = await db.from('service_regions')
        .insert({ name: REGION, description: 'MVP service area', is_active: false }).select('id').single()
      if (e3) throw e3
      regionId = created.id
    }
    const { data: taken } = await db.from('service_region_members').select('locality_id, region_id').in('locality_id', (locs ?? []).map((l) => l.id))
    const takenElsewhere = (taken ?? []).filter((t) => t.region_id !== regionId).map((t) => t.locality_id)
    if (takenElsewhere.length) console.log(`  skipped ${takenElsewhere.length} localities that already belong to another region`)
    const rows = (locs ?? []).filter((l) => !takenElsewhere.includes(l.id)).map((l) => ({ locality_id: l.id, region_id: regionId }))
    const { error: e4 } = await db.from('service_region_members').upsert(rows, { onConflict: 'locality_id' })
    if (e4) throw e4
  }

  // 4 ── link profiles whose address is exactly one locality's name
  console.log('\n[3/4] Existing profiles with no area chosen')
  const names = new Map<string, string[]>() // key → locality ids
  for (let from = 0; ; from += 1000) {
    const { data } = await db.from('localities').select('id, search_he, search_en, name_en_display').range(from, from + 999)
    for (const l of data ?? []) {
      const keys = [l.search_he, ...(l.search_en ?? '').split(' | '), l.name_en_display ? normalizeEn(l.name_en_display) : ''].filter(Boolean)
      for (const k of Array.from(new Set(keys))) names.set(k, [...(names.get(k) ?? []), l.id])
    }
    if (!data || data.length < 1000) break
  }
  const keyOf = (a: string) => (/[֐-׿]/.test(a) ? normalizeHe(a) : normalizeEn(a))
  for (const table of ['customers', 'cleaners'] as const) {
    const { data: people } = await db.from(table).select('id, address').is('locality_id', null)
    for (const p of people ?? []) {
      const addr = (p.address ?? '').trim()
      const ids = addr ? Array.from(new Set(names.get(keyOf(addr)) ?? [])) : []
      if (ids.length === 1) {
        console.log(`  ${table.padEnd(9)} ${p.id.slice(0, 8)}  "${addr}"  →  linked`)
        if (WRITE) {
          const { error: e5 } = await db.from(table).update({ locality_id: ids[0] }).eq('id', p.id)
          if (e5) throw e5
        }
      } else {
        console.log(`  ${table.padEnd(9)} ${p.id.slice(0, 8)}  "${addr}"  →  ${ids.length > 1 ? 'AMBIGUOUS, left alone' : 'no exact match, left alone'}`)
      }
    }
  }
  console.log('\n[4/4] Nothing was opened or closed.' + (WRITE ? '' : '  Re-run with --write to apply.'))
}

main().catch((e) => { console.error(e); process.exit(1) })
