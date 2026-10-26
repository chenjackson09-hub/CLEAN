import { addHours, bookingLink, buildGoogleCalendarUrl, calendarDescription, type CalendarEventInput } from './googleCalendar'

const base: CalendarEventInput = {
  bookingId: 'a1b2c3d4-0000-4000-8000-000000000000',
  date: '2026-10-15',
  start: '09:00:00',
  durationHours: 3,
  cleaningType: 'deep',
  area: 'Beit Hillel',
  withName: 'Noa R.',
  hourlyRate: 80,
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
    expect(p.get('text')).toBe('Cleaning Booked - Noa R.')
    expect(p.get('dates')).toBe('20261015T090000/20261015T120000')
    expect(p.get('ctz')).toBe('Asia/Jerusalem')
    expect(p.get('location')).toBe('Beit Hillel')
  })
  it('writes the description in the agreed format (English)', () => {
    expect(parse(buildGoogleCalendarUrl(base)!).get('details')).toBe(
      [
        'Cleaning Booked with Noa R.',
        'Location: Beit Hillel',
        'Service: Deep Cleaning',
        'Rate: ₪80 per hour',
        '',
        'View Booking:',
        base.link,
        '',
        'For exact address or coordination please use your private chat in app',
      ].join('\n'),
    )
  })
  it('writes the same description in Hebrew', () => {
    const p = parse(buildGoogleCalendarUrl({ ...base, lang: 'he', area: 'בית הלל', withName: 'נועה ר.' })!)
    expect(p.get('text')).toBe('ניקיון נקבע - נועה ר.')
    expect(p.get('details')).toBe(
      [
        'ניקיון נקבע עם נועה ר.',
        'מיקום: בית הלל',
        'שירות: ניקיון יסודי',
        'תעריף: ₪80 לשעה',
        '',
        'צפייה בהזמנה:',
        base.link,
        '',
        'לכתובת המדויקת או לתיאום, אנא השתמשו בצ׳אט הפרטי באפליקציה',
      ].join('\n'),
    )
  })
  it('has no booking reference or duration line any more', () => {
    const d = parse(buildGoogleCalendarUrl(base)!).get('details')!
    expect(d).not.toMatch(/Reference|#A1B2C3D4|duration|Estimated/i)
  })
  it('skips the rate line when the rate is unknown or nonsense, and formats decimals', () => {
    for (const hourlyRate of [undefined, null, 0, 'abc']) {
      expect(parse(buildGoogleCalendarUrl({ ...base, hourlyRate })!).get('details')).not.toContain('Rate:')
    }
    expect(calendarDescription({ ...base, hourlyRate: '82.50' })).toContain('Rate: ₪82.5 per hour')
  })
  it('says just "Cleaning Booked" when the other person’s name is unknown', () => {
    const p = parse(buildGoogleCalendarUrl({ ...base, withName: null })!)
    expect(p.get('text')).toBe('Cleaning Booked')
    expect(p.get('details')!.split('\n')[0]).toBe('Cleaning Booked')
  })
  it('leaves the location blank when there is no area (never falls back to an address)', () => {
    for (const area of [undefined, null, '', '   ']) {
      const p = parse(buildGoogleCalendarUrl({ ...base, area })!)
      expect(p.has('location')).toBe(false)
      expect(p.get('details')).not.toContain('Location:')
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
    expect(p.get('text')).toContain('ניקיון נקבע')
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
})
