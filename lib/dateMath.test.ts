import { daysBetween, isSameWeek, weekdayOf } from './dateMath'

describe('dateMath', () => {
  it('daysBetween counts whole calendar days', () => {
    expect(daysBetween('2026-10-05', '2026-10-06')).toBe(1)
    expect(daysBetween('2026-10-05', '2026-10-03')).toBe(-2)
  })

  it('weekdayOf is Sunday-based', () => {
    expect(weekdayOf('2026-10-04')).toBe(0) // Sunday
    expect(weekdayOf('2026-10-10')).toBe(6) // Saturday
  })

  it('isSameWeek runs Sunday through Saturday', () => {
    expect(isSameWeek('2026-10-04', '2026-10-10')).toBe(true) // Sun..Sat
    expect(isSameWeek('2026-10-10', '2026-10-11')).toBe(false) // Sat | Sun
    expect(isSameWeek('2026-10-05', '2026-09-16')).toBe(false)
  })

  it('isSameWeek works across a month/year boundary', () => {
    expect(isSameWeek('2026-12-30', '2027-01-02')).toBe(true)
  })
})
