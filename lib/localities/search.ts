import { normalizeEn, normalizeHe, normalizeQuery } from './normalize'

// What the autocomplete returns for one locality.
export type LocalityOption = {
  id: string
  cbs_code: number
  name_he: string
  name_en: string | null
  locality_type: string
  regional_council: string | null
  lat: number | null
  lng: number | null
  population?: number | null
}

type Candidate = LocalityOption & { search_he: string; search_en: string; alias_keys?: string[] }

// Edit distance — used only to order matches of the same kind (the closer the
// whole name is to what was typed, the higher it ranks).
function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length][b.length]
}

const skeleton = (s: string) => s.replace(/[aeiouy\s]/g, '')

// How well a locality matches a query key (higher = better; null = no match).
// Order: exact name → name starts with the query → a WORD in the name starts with
// it ("Hillel" finds "Beit Hillel") → the key appears somewhere. The keys are the
// normalised ones (see normalize.ts), so "קריית" finds "קרית" and "Bet" finds "Beit".
export function matchScore(c: Candidate, key: string, script: 'he' | 'en'): number | null {
  if (!key) return null
  const pool = [
    ...(script === 'he' ? [c.search_he] : c.search_en.split(' | ')),
    ...(c.alias_keys ?? []),
  ].filter(Boolean)
  let best: number | null = null
  for (const s of pool) {
    let score: number | null = null
    if (s === key) score = 100
    else if (s.startsWith(key)) score = 80
    else if (s.split(' ').some((w) => w.startsWith(key))) score = 60
    else if (s.includes(key)) score = 40
    // English transliterations differ mostly in vowels (Shemona / Shmona, Barukh /
    // Baruch), so as a last resort compare consonants only.
    else if (script === 'en' && skeleton(key).length >= 4 && skeleton(s).includes(skeleton(key))) score = 30
    if (score != null) {
      // Closer overall name = a little higher, so "Bet Hil" puts Bet Hillel above
      // a longer "Bet Hilqiyya", and "Sde Nehemia" beats "Sede Nahum".
      const closeness = 1 - distance(key, s) / Math.max(key.length, s.length)
      score += 5 * closeness
      if (best == null || score > best) best = score
    }
  }
  return best
}

export function rankLocalities(candidates: Candidate[], query: string, limit = 8): LocalityOption[] {
  const { key, script } = normalizeQuery(query)
  return candidates
    .map((c) => ({ c, score: matchScore(c, key, script) }))
    .filter((x): x is { c: Candidate; score: number } => x.score != null)
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.c.population ?? 0) - (a.c.population ?? 0) ||
        a.c.name_he.localeCompare(b.c.name_he, 'he'),
    )
    .slice(0, limit)
    .map(({ c }) => ({
      id: c.id, cbs_code: c.cbs_code, name_he: c.name_he, name_en: c.name_en, locality_type: c.locality_type,
      regional_council: c.regional_council, lat: c.lat, lng: c.lng,
    }))
}

// Keys for an alias typed by an admin (never invented by the import).
export function aliasKey(alias: string): string {
  return /[֐-׿]/.test(alias) ? normalizeHe(alias) : normalizeEn(alias)
}
