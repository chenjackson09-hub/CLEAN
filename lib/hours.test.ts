import { formatHours, isQuarterHour } from './hours'

describe('job-length hours', () => {
  it('formats quarter-hour steps', () => {
    expect(formatHours(0.5)).toBe('30 min')
    expect(formatHours(0.75)).toBe('45 min')
    expect(formatHours(1)).toBe('1 h')
    expect(formatHours(3.25)).toBe('3 h 15 min')
    expect(formatHours(3.25, 'he')).toBe('3 ש׳ 15 דק׳')
  })
  it('accepts only quarter-hour values', () => {
    for (const ok of [0.5, 0.75, 1, 1.25, 4.5, 12]) expect(isQuarterHour(ok)).toBe(true)
    for (const bad of [0.3, 1.1, 2.9, NaN]) expect(isQuarterHour(bad)).toBe(false)
  })
})
