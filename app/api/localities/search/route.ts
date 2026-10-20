import { NextResponse } from 'next/server'
import { normalizeQuery } from '@/lib/localities/normalize'
import { rankLocalities } from '@/lib/localities/search'
import { loadLocalityDirectory } from '@/lib/localities/directory'

// Locality autocomplete. Public (it is also used on the registration screens,
// before an account exists) and read-only: only geography — names, type, council,
// position — never availability or anything about users. The query is reduced to
// the same normalised key the names are stored with, so Hebrew, English and
// alternative spellings all land on the same record; results are ranked here and
// capped at 8, so the list is never sent to the device.
//
// The list is kept in memory by lib/localities/directory.ts (shared with the admin
// Locations search) and ranked there, so vowel-insensitive English spellings match.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 40)
  if (!q || !normalizeQuery(q).key) return NextResponse.json({ results: [] })
  try {
    return NextResponse.json({ results: rankLocalities(await loadLocalityDirectory(), q, 8) })
  } catch (e) {
    console.error('locality search failed', e)
    return NextResponse.json({ results: [], error: 'unavailable' })
  }
}
