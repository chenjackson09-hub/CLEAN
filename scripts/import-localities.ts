/* eslint-disable no-console */
// Imports the official Israeli localities list (Central Bureau of Statistics,
// "Localities file 2023" on data.gov.il) into `localities`.
//
//   npm run import:localities                 dry run: validate + print a report, write nothing
//   npm run import:localities -- --verify     also cross-check the launch communities against
//                                             OpenStreetMap (1 request/second)
//   npm run import:localities -- --write      upsert into the database (needs migration 0037)
//
// It only ever writes the `localities` table — never availability, regions or
// overrides — so importing can't open an area. Re-running updates in place (keyed on
// the official code). Coordinates are converted from the file's Israeli grid; a
// locality with no usable coordinate is imported WITHOUT one rather than guessed.
import { createClient } from '@supabase/supabase-js'
import { normalizeEn, normalizeHe } from '../lib/localities/normalize'
import {
  isPlausibleIsraelCoordinate, isResidential, localityTypeFor, parseItmCoordinates, regionalCouncilFrom,
} from '../lib/localities/cbs'
import { itmToWgs84 } from '../lib/localities/itm'

const RESOURCE_ID = 'd47a54ff-87f0-44b3-b33a-f284c0c38e5a' // "קובץ היישובים 2023"
const SOURCE = 'cbs-localities-2023'

type Raw = Record<string, string | number | null>
const args = new Set(process.argv.slice(2))

// The preliminary launch list from the product brief — for review only, never activated here.
const LAUNCH_CANDIDATES: [string, string][] = [
  ['בית הלל', 'Beit Hillel'], ['כפר בלום', 'Kfar Blum'], ['הגושרים', 'HaGoshrim'], ['שדה נחמיה', 'Sde Nehemia'],
  ['דפנה', 'Dafna'], ['דן', 'Dan'], ['קריית שמונה', 'Kiryat Shmona'], ['מעיין ברוך', "Ma'ayan Baruch"],
  ['יובל', 'Yuval (Kfar Yuval)'], ['מטולה', 'Metula'], ['שאר ישוב', "She'ar Yashuv"], ['שניר', 'Snir'],
  ['נאות מרדכי', 'Neot Mordechai'], ['עמיר', 'Amir'], ['שמיר', 'Shamir'], ['כפר סאלד', 'Kfar Szold'],
]

async function fetchAll(): Promise<Raw[]> {
  const res = await fetch(`https://data.gov.il/api/3/action/datastore_search?resource_id=${RESOURCE_ID}&limit=5000`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })
  if (!res.ok) throw new Error(`data.gov.il responded ${res.status}`)
  const body = await res.json()
  return body.result.records as Raw[]
}

const str = (v: unknown) => (v == null || String(v).trim() === '' ? null : String(v).trim())
const int = (v: unknown) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Math.round(Number(v)))

function toRow(r: Raw) {
  const formCode = int(r['צורת יישוב שוטפת - ארעי'])
  const itm = parseItmCoordinates(r['קואורדינטות'])
  let lat: number | null = null
  let lng: number | null = null
  if (itm) {
    const c = itmToWgs84(itm.x, itm.y)
    if (isPlausibleIsraelCoordinate(c.lat, c.lng)) { lat = c.lat; lng = c.lng }
  }
  const nameHe = String(r['שם יישוב']).trim()
  const nameEn = str(r['שם יישוב באנגלית'])
  const translit = str(r['תעתיק'])
  const municipal = str(r['שם מעמד מונציפאלי'])
  return {
    cbs_code: int(r['סמל יישוב'])!,
    name_he: nameHe,
    name_en: nameEn,
    name_translit: translit,
    locality_type: localityTypeFor(formCode, municipal),
    form_code: formCode,
    district: str(r['שם מחוז']),
    subdistrict: str(r['שם נפה']),
    regional_council: regionalCouncilFrom(municipal),
    municipal_status: municipal,
    lat, lng,
    population: int(r['סך הכל אוכלוסייה 2023 - ארעי']),
    // Both the English name and the CBS transliteration feed the English key.
    search_he: normalizeHe(nameHe),
    search_en: [nameEn, translit].filter(Boolean).map((s) => normalizeEn(s as string)).filter((s, i, a) => a.indexOf(s) === i).join(' | '),
    source: SOURCE,
  }
}

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

async function nominatim(q: string) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=il&q=${encodeURIComponent(q)}`, {
    headers: { 'User-Agent': 'Clean-App-import-check' },
  })
  const rows = (await res.json()) as { lat: string; lon: string; type: string }[]
  const place = rows.find((x) => ['village', 'town', 'city', 'hamlet', 'administrative'].includes(x.type)) ?? rows[0]
  return place ? { lat: Number(place.lat), lng: Number(place.lon) } : null
}

async function main() {
  const raw = await fetchAll()
  const kept = raw.filter((r) => isResidential(int(r['צורת יישוב שוטפת - ארעי'])))
  const rows = kept.map(toRow)

  const byType: Record<string, number> = {}
  for (const r of rows) byType[r.locality_type] = (byType[r.locality_type] ?? 0) + 1
  const noCoords = rows.filter((r) => r.lat == null)
  const dupKeys = new Map<string, string[]>()
  for (const r of rows) dupKeys.set(r.search_he, [...(dupKeys.get(r.search_he) ?? []), r.name_he])
  const dups = Array.from(dupKeys.entries()).filter(([, v]) => v.length > 1)

  console.log(`Source: ${raw.length} entries · kept ${rows.length} residential · left out ${raw.length - rows.length} (industrial zones / administrative areas)`)
  console.log('By type:', byType)
  console.log(`Without a usable coordinate (imported with none, never guessed): ${noCoords.length}`)
  if (noCoords.length) console.log('  e.g.', noCoords.slice(0, 8).map((r) => r.name_he).join(', '))
  console.log(`Names that collide after normalising (kept as separate records, shown with their council/district): ${dups.length}`)
  for (const [k, v] of dups.slice(0, 5)) console.log('  ', k, '→', v.join(' | '))

  console.log('\nProposed launch candidates (REVIEW ONLY — nothing is activated):')
  const verify = args.has('--verify')
  for (const [he, label] of LAUNCH_CANDIDATES) {
    const key = normalizeHe(he)
    const hits = rows.filter((r) => r.search_he === key)
    if (hits.length !== 1) { console.log(`  ✗ ${he} (${label}): ${hits.length === 0 ? 'NOT in the official file' : `${hits.length} matches`}`); continue }
    const h = hits[0]
    let extra = ''
    if (verify && h.lat != null) {
      const osm = await nominatim(`${h.name_he}, ישראל`)
      extra = osm ? ` · OSM check: ${haversineKm({ lat: h.lat, lng: h.lng! }, osm).toFixed(2)} km apart` : ' · OSM: not found'
      await new Promise((r) => setTimeout(r, 1100))
    }
    console.log(`  ✓ ${h.name_he} — ${h.name_en} · ${h.locality_type} · ${h.regional_council ?? h.municipal_status} · ${h.lat?.toFixed(4)}, ${h.lng?.toFixed(4)}${extra}`)
  }

  if (!args.has('--write')) { console.log('\nDry run — nothing written. Use --write to import.'); return }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (load .env.local).')
  const admin = createClient(url, key)
  let done = 0
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200).map((r) => ({ ...r, updated_at: new Date().toISOString() }))
    const { error } = await admin.from('localities').upsert(batch, { onConflict: 'cbs_code' })
    if (error) throw new Error(`Batch at ${i} failed: ${error.message} (has migration 0037 been run?)`)
    done += batch.length
  }
  console.log(`\nImported ${done} localities. No availability was changed — every locality is inactive.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
