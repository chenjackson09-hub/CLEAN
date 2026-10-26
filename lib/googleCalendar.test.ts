import { addHours, bookingLink, bookingReference, buildGoogleCalendarUrl, calendarDescription, type CalendarEventInput } from './googleCalendar'

const base: CalendarEventInput = {
  bookingId: 'a1b2c3d4-0000-4000-8000-000000000000',
  date: '2026-10-15',
  start: '09:00:00',
  durationHours: 3,
  cleaningType: 'deep',
  area: 'Beit Hillel',
  withName: 'Noa R.',
  link: 'https://clean.example/bookings?booking=a1b2c3d4-0000-4000-8000-000000000000',
  lang: 'en',
}
const parse = (url: string) => new URL(url).searchParams

describe('addHours', () => {
  it('adds whole and half hours', () => {
    expect(addHours('2026-10-15', '09:00', 3)).toEqual({ date: '2026-10-15', time: '12:00' })
    expect(addHours('2026-10-15', '09:15:00', 2.5)).toEqual({ date: '2026-10-15', time: '11:45' })
  })
  it('rolls past midnight into the next day, month and year', () => {
    expect(addHours('2026-10-15', '22:00', 3)).toEqual({ date: '2026-10-16', time: '01:00' })
    expect(addHours('2026-10-31', '23:00', 2)).toEqual({ date: '2026-11-01', time: '01:00' })
    expect(addHours('2026-12-31', '23:30', 1)).toEqual({ date: '2027-01-01', time: '00:30' })
  })
  it('returns null for a malformed date or time', () => {
    expect(addHours('15/10/2026', '09:00', 1)).toBeNull()
    expect(addHours('2026-10-15', 'nine', 1)).toBeNull()
  })
})

describe('buildGoogleCalendarUrl', () => {
  it('builds a Google Calendar template URL with the right fields', () => {
    const url = buildGoogleCalendarUrl(base)!
    expect(url.startsWith('https://calendar.google.com/calendar/render?')).toBe(true)
    const p = parse(url)
    expect(p.get('action')).toBe('TEMPLATE')
    expect(p.get('text')).toBe('Cleaning Appointment – #A1B2C3D4')
    expect(p.get('dates')).toBe('20261015T090000/20261015T120000')
    expect(p.get('ctz')).toBe('Asia/Jerusalem')
    expect(p.get('location')).toBe('Beit Hillel')
  })
  it('carries the booking reference, service, area and a direct link in the description', () => {
    const d = parse(buildGoogleCalendarUrl(base)!).get('details')!
    expect(d).toContain('Booking Reference: #A1B2C3D4')
    expect(d).toContain('Service: Deep cleaning')
    expect(d).toContain('Area: Beit Hillel')
    expect(d).toContain('With: Noa R.')
    expect(d).toContain('about 3 h')
    expect(d).toContain(base.link)
    expect(d).toContain('private chat')
  })
  it('leaves the location blank when there is no area (never falls back to an address)', () => {
    for (const area of [undefined, null, '', '   ']) {
      const p = parse(buildGoogleCalendarUrl({ ...base, area })!)
      expect(p.has('location')).toBe(false)
      expect(p.get('details')).not.toContain('Area:')
    }
  })
  it('only ever contains what it is given — the street address cannot get in', () => {
    // The module has no address/notes parameter; prove nothing but the supplied fields appear.
    const url = buildGoogleCalendarUrl(base)!
    const everything = decodeURIComponent(url.replace(/\+/g, ' '))
    expect(everything).not.toMatch(/Herzl|street|apartment|floor|apt/i)
  })
  it('handles an evening clean that ends after midnight', () => {
    const p = parse(buildGoogleCalendarUrl({ ...base, start: '22:00', durationHours: 3 })!)
    expect(p.get('dates')).toBe('20261015T220000/20261016T010000')
  })
  it('falls back to 2 hours for a missing, zero or nonsense duration (and reads PostgREST strings)', () => {
    const dates = (d: CalendarEventInput['durationHours']) => parse(buildGoogleCalendarUrl({ ...base, durationHours: d })!).get('dates')
    expect(dates(null)).toBe('20261015T090000/20261015T110000')
    expect(dates(0)).toBe('20261015T090000/20261015T110000')
    expect(dates(-3)).toBe('20261015T090000/20261015T110000')
    expect(dates('3.50')).toBe('20261015T090000/20261015T123000')
  })
  it('returns null for an unusable date/time instead of a broken link', () => {
    expect(buildGoogleCalendarUrl({ ...base, date: '' })).toBeNull()
    expect(buildGoogleCalendarUrl({ ...base, start: '' })).toBeNull()
  })
  it('encodes special characters safely (Hebrew, ampersands, quotes)', () => {
    const url = buildGoogleCalendarUrl({ ...base, lang: 'he', area: 'מעיין ברוך & "דן"', withName: 'נועה <ר.>' })!
    const p = parse(url)
    expect(p.get('location')).toBe('מעיין ברוך & "דן"')
    expect(p.get('text')).toContain('ניקיון')
    expect(p.get('details')).toContain('נועה <ר.>')
    expect(url).not.toContain('"')
    expect(url).not.toContain('<')
  })
  it('omits the service line when the booking has no cleaning type', () => {
    expect(calendarDescription({ ...base, cleaningType: null })).not.toContain('Service:')
  })
})

describe('booking link and reference', () => {
  it('uses the production origin and the booking id, and nothing sensitive', () => {
    expect(bookingLink('host', 'abc-123', 'https://clean-roan.vercel.app/')).toBe('https://clean-roan.vercel.app/bookings?booking=abc-123')
    expect(bookingLink('cleaner', 'abc-123', 'https://clean-roan.vercel.app')).toBe('https://clean-roan.vercel.app/cleaner/dashboard?booking=abc-123')
  })
  it('makes a short readable reference', () => {
    expect(bookingReference('a1b2c3d4-0000-4000-8000-000000000000')).toBe('#A1B2C3D4')
  })
})
