import { LEGAL_DRAFT, TERMS_VERSION, legalDoc } from './content'

describe.each(['terms', 'privacy'] as const)('%s text', (kind) => {
  const en = legalDoc(kind, 'en')
  const he = legalDoc(kind, 'he')

  it('exists in English and Hebrew with the same sections', () => {
    expect(en.sections.length).toBeGreaterThan(5)
    expect(he.sections.length).toBe(en.sections.length)
    en.sections.forEach((s, i) => expect(he.sections[i].body.length).toBe(s.body.length))
    for (const d of [en, he]) {
      expect(d.title).toBeTruthy()
      expect(d.intro).toBeTruthy()
      d.sections.forEach((s) => { expect(s.heading).toBeTruthy(); s.body.forEach((p) => expect(p.trim().length).toBeGreaterThan(10)) })
    }
  })
})

describe('what the policy promises matches what the app does', () => {
  const privacy = legalDoc('privacy', 'en').sections.map((s) => [s.heading, ...s.body].join(' ')).join(' ')
  it('says home photos are private and only for a cleaner with a live request', () => {
    expect(privacy).toMatch(/Photos of a home are private/)
    expect(privacy).toMatch(/live request/)
  })
  it('says email, phone and date of birth are not shown to other users', () => {
    expect(privacy).toMatch(/email, password, phone number and date of birth are not shown/)
  })
  it('says the street address goes to the cleaner with a request, not on the profile', () => {
    expect(privacy).toMatch(/street address is shared with the cleaner when the host sends a request/)
  })
})

describe('terms', () => {
  it('has a version and is marked as a draft until a lawyer has read it', () => {
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(LEGAL_DRAFT).toBe(true)
  })
})
