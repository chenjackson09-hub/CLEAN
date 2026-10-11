// Search keys for locality names. Hebrew and English spellings of the same
// place differ in small, predictable ways (קרית / קריית, Bet / Beit, Kefar / Kfar,
// Qiryat / Kiryat, Barukh / Baruch). Both the stored names and the user's query
// are reduced to the same key, so they meet in the middle. The keys are only for
// MATCHING — what the user sees is always the official name.

const NIQQUD_AND_MARKS = /[֑-ׇ]/g // Hebrew points and cantillation
const PUNCTUATION = /["'`´’‘“”׳״.,()*]/g

export function normalizeHe(input: string): string {
  return input
    .normalize('NFC')
    .replace(NIQQUD_AND_MARKS, '')
    .replace(PUNCTUATION, '')
    .replace(/[-–־_/]/g, ' ')
    // spelling with / without the doubled yod or vav: קריית = קרית, מעיין = מעין
    .replace(/י{2,}/g, 'י')
    .replace(/ו{2,}/g, 'ו')
    .replace(/\s+/g, ' ')
    .trim()
}

// Whole-word spellings that differ between transliteration schemes.
const EN_WORDS: Record<string, string> = {
  bet: 'beit',
  bayt: 'beit',
  sede: 'sde',
  kefar: 'kfar',
  kfar: 'kfar',
  qiryat: 'kiryat',
  kiriat: 'kiryat',
  kiryat: 'kiryat',
  nir: 'nir',
}

export function normalizeEn(input: string): string {
  const folded = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents
    .toLowerCase()
    .replace(/['`´’‘]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return folded
    .split(' ')
    .filter(Boolean)
    .map((w) => EN_WORDS[w] ?? w)
    .join(' ')
    // letter-level spelling variants
    .replace(/kh/g, 'h')
    .replace(/ch/g, 'h')
    .replace(/q/g, 'k')
    .replace(/tz|ts/g, 'z')
    .replace(/ph/g, 'f')
    .replace(/w/g, 'v')
    // doubled letters ("Hillel"/"Hilel", "Maayan"/"Mayan")
    .replace(/([a-z])\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

const HEBREW = /[֐-׿]/

// Which key a query should be matched against.
export function normalizeQuery(input: string): { script: 'he' | 'en'; key: string } {
  return HEBREW.test(input) ? { script: 'he', key: normalizeHe(input) } : { script: 'en', key: normalizeEn(input) }
}
