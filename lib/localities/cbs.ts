// Reading the Central Bureau of Statistics "Localities file" (קובץ היישובים) —
// the official list of Israeli localities (data.gov.il, dataset
// `localities-in-israel`). Pure helpers so they can be tested without the network.

export const LOCALITY_TYPES = [
  'city', // עיר
  'local_council', // מועצה מקומית
  'kibbutz', // קיבוץ
  'moshav', // מושב
  'moshav_shitufi', // מושב שיתופי
  'community', // יישוב קהילתי
  'village', // כפר / יישוב ערבי, דרוזי, צ'רקסי
  'bedouin_tribe', // שבט בדווי
  'other', // other recognised localities
] as const
export type LocalityType = (typeof LOCALITY_TYPES)[number]

// CBS "settlement form" codes (צורת יישוב). Only codes whose meaning was checked
// against known places are given a specific type; the rest are `other` rather
// than guessed (e.g. 310 = Beit Hillel, a moshav; 330 = Kfar Blum, a kibbutz;
// 190 = Metula, a local council; 370 = Be'er Ora, a community settlement).
const FORM_CODE_TYPE: Record<number, LocalityType> = {
  120: 'city', 130: 'city', 140: 'city', 150: 'city', 160: 'city',
  250: 'city',
  170: 'local_council', 180: 'local_council', 190: 'local_council',
  191: 'local_council', 192: 'local_council', 193: 'local_council',
  260: 'village', 270: 'village', 280: 'village', 290: 'village', 440: 'village', 450: 'village',
  460: 'bedouin_tribe',
  310: 'moshav',
  320: 'moshav_shitufi',
  330: 'kibbutz',
  370: 'community',
}

// Entries that are not places people live: industrial zones, regional-council
// administrative units, etc. They are left out of the imported list.
export const NON_RESIDENTIAL_FORM_CODES = new Set([520, 530])

export function localityTypeFor(formCode: number | null | undefined, municipalStatus?: string | null): LocalityType {
  if (municipalStatus && municipalStatus.trim() === 'עירייה') return 'city'
  return (formCode != null && FORM_CODE_TYPE[formCode]) || 'other'
}

export function isResidential(formCode: number | null | undefined): boolean {
  return formCode == null || !NON_RESIDENTIAL_FORM_CODES.has(formCode)
}

// "מועצה אזורית מבואות החרמון" → "מבואות החרמון"; null for cities / local councils.
export function regionalCouncilFrom(municipalStatus: string | null | undefined): string | null {
  const m = (municipalStatus ?? '').trim()
  const prefix = 'מועצה אזורית '
  return m.startsWith(prefix) ? m.slice(prefix.length).trim() || null : null
}

// The file stores each locality's position as one 12-digit number: 6 digits of
// Israeli Transverse Mercator easting followed by 6 of northing. Returns null when
// the source has no usable value (we never invent one).
export function parseItmCoordinates(value: unknown): { x: number; y: number } | null {
  if (value == null) return null
  const s = String(value).replace(/\.0+$/, '').trim()
  if (!/^\d{12}$/.test(s)) return null
  return { x: Number(s.slice(0, 6)), y: Number(s.slice(6)) }
}

// Rough bounding box of Israel and the territories the file covers — a sanity
// check on converted coordinates, not a boundary.
export function isPlausibleIsraelCoordinate(lat: number, lng: number): boolean {
  return lat >= 29.3 && lat <= 33.5 && lng >= 34.2 && lng <= 36.0
}
