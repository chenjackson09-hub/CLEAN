import fs from 'fs'
import path from 'path'
import { translations } from '@/lib/i18n/translations'
import { CLEANER_SERVICES, EXPERIENCE_RANGES, LANGUAGE_CHIPS, SERVICE_GROUPS } from './options'

// A wizard that asks for a string nobody wrote shows the raw key on screen
// ("auth.registerCustomer.langHebrew"). This checks every string the two wizards use exists
// in English AND Hebrew.
const root = path.resolve(__dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8')

type Block = Record<string, unknown>
const auth = (lang: 'en' | 'he') => (translations[lang] as unknown as { auth: Record<string, Block> }).auth

function usedKeys(page: string, extra: string[]): string[] {
  const src = read(page)
  return Array.from(new Set([...Array.from(src.matchAll(/tr\("([A-Za-z0-9]+)"/g)).map((m) => m[1]), ...extra]))
}

const cases: { name: 'registerCleaner' | 'registerCustomer'; page: string; extra: string[] }[] = [
  {
    name: 'registerCleaner',
    page: 'app/(auth)/register/cleaner/page.tsx',
    extra: [
      ...CLEANER_SERVICES.map((s) => s.key), ...SERVICE_GROUPS.map((g) => g.key), ...EXPERIENCE_RANGES.map((r) => r.key), ...LANGUAGE_CHIPS.map((l) => l.key),
    ],
  },
  {
    name: 'registerCustomer',
    page: 'app/(auth)/register/customer/page.tsx',
    extra: [
      ...LANGUAGE_CHIPS.map((l) => l.key),
      'homeApartment', 'homeHouse', 'homeVilla', 'homeGuesthouse', 'homeOffice', 'homeOther', 'petsDog', 'petsCat', 'petsOther',
    ],
  },
]

describe.each(cases)('$name strings', ({ name, page, extra }) => {
  const keys = usedKeys(page, extra)
  it.each(['en', 'he'] as const)('has every string the wizard uses (%s)', (lang) => {
    const block = auth(lang)[name]
    const missing = keys.filter((k) => typeof block[k] !== 'string')
    expect(missing).toEqual([])
  })
})
