// Shared language definitions for the multi-select language picker used across
// user forms (cleaner profile + cleaner registration today; other user types
// later). Each language's canonical stored value is a short code written in
// that language's OWN script — e.g. English "EN", Hebrew "עב", Arabic "عر",
// Russian "РУ". The full native name is shown next to the code in the picker.

export type LanguageOption = { code: string; name: string }

// Ordered most-locally-relevant first (Israeli market), then broader world
// languages. Extend this list to add a language everywhere the picker is used.
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'עב', name: 'עברית' },       // Hebrew
  { code: 'EN', name: 'English' },      // English
  { code: 'عر', name: 'العربية' },      // Arabic
  { code: 'РУ', name: 'Русский' },      // Russian
  { code: 'አማ', name: 'አማርኛ' },        // Amharic
  { code: 'FR', name: 'Français' },     // French
  { code: 'УК', name: 'Українська' },   // Ukrainian
  { code: 'ES', name: 'Español' },      // Spanish
  { code: 'PT', name: 'Português' },    // Portuguese
  { code: 'DE', name: 'Deutsch' },      // German
  { code: 'IT', name: 'Italiano' },     // Italian
  { code: 'RO', name: 'Română' },       // Romanian
  { code: 'TL', name: 'Tagalog' },      // Tagalog / Filipino
  { code: '中', name: '中文' },          // Chinese
  { code: 'हि', name: 'हिन्दी' },        // Hindi
]

// Legacy/alternate spellings → canonical code. Old data comes in two shapes:
// the previous free-text profile input (full English names like "English") and
// the old registration checkboxes ("HE"/"AR"/"RU"). Both must map onto the new
// codes so nothing is lost when a cleaner re-saves or their languages display.
const ALIASES: Record<string, string> = {
  he: 'עב', iw: 'עב', hebrew: 'עב',
  en: 'EN', eng: 'EN', english: 'EN',
  ar: 'عر', arabic: 'عر',
  ru: 'РУ', russian: 'РУ',
  am: 'አማ', amharic: 'አማ',
  fr: 'FR', french: 'FR',
  uk: 'УК', ua: 'УК', ukrainian: 'УК',
  es: 'ES', spa: 'ES', spanish: 'ES',
  pt: 'PT', portuguese: 'PT',
  de: 'DE', ger: 'DE', german: 'DE',
  it: 'IT', italian: 'IT',
  ro: 'RO', romanian: 'RO',
  tl: 'TL', fil: 'TL', tagalog: 'TL', filipino: 'TL',
  zh: '中', cn: '中', chinese: '中', mandarin: '中',
  hi: 'हि', hindi: 'हि',
}

const CODE_SET = new Set(LANGUAGE_OPTIONS.map((o) => o.code))

// Case-insensitive lookup covering canonical codes, native names, and aliases.
const LOOKUP = new Map<string, string>()
for (const o of LANGUAGE_OPTIONS) {
  LOOKUP.set(o.code.toLowerCase(), o.code)
  LOOKUP.set(o.name.toLowerCase(), o.code)
}
for (const [k, v] of Object.entries(ALIASES)) LOOKUP.set(k, v)

// Map a single stored/typed value to its short code. Returns the input
// unchanged when it isn't a language we recognise, so custom values survive.
export function languageShort(value: string): string {
  const v = value.trim()
  if (!v) return v
  if (CODE_SET.has(v)) return v
  return LOOKUP.get(v.toLowerCase()) ?? v
}

// Normalize a stored list to canonical codes — de-duped, blanks dropped.
export function normalizeLanguages(values: string[]): string[] {
  const out: string[] = []
  for (const raw of values) {
    const code = languageShort(raw)
    if (code && !out.includes(code)) out.push(code)
  }
  return out
}
