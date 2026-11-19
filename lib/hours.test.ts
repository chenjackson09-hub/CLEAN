import { formatHours, hoursToMinutes, isJobLengthHours, minutesToHours, stepHours, MIN_JOB_HOURS } from './hours'

describe('job-length hours', () => {
  it('turns minutes into stored hours and back without drift', () => {
    expect(minutesToHours(20)).toBe(0.33)
    expect(MIN_JOB_HOURS).toBe(0.33)
    for (let m = 20; m <= 24 * 60; m += 5) expect(hoursToMinutes(minutesToHours(m))).toBe(m)
  })
  it('formats minutes', () => {
    expect(formatHours(0.33)).toBe('20 min')
    expect(formatHours(0.42)).toBe('25 min')
    expect(formatHours(0.5)).toBe('30 min')
    expect(formatHours(0.75)).toBe('45 min')
    expect(formatHours(1)).toBe('1 h')
    expect(formatHours(1.33)).toBe('1 h 20 min')
    expect(formatHours(3.25)).toBe('3 h 15 min')
    expect(formatHours(3.25, 'he')).toBe('3 ש׳ 15 דק׳')
  })
  it('accepts any 5-minute step from 20 minutes', () => {
    for (const m of [20, 25, 30, 45, 60, 80, 100, 135, 720]) expect(isJobLengthHours(minutesToHours(m))).toBe(true)
    expect(isJobLengthHours(0.5)).toBe(true)
    expect(isJobLengthHours(4.25)).toBe(true)
  })
  it('refuses shorter than 20 minutes and anything off the 5-minute grid', () => {
    for (const bad of [0.25, 0.1, 0, -1, NaN, 1.1, 2.9, 4.3, 0.55]) expect(isJobLengthHours(bad)).toBe(false)
  })
  it('steps 5 minutes under an hour, then 15, and back', () => {
    expect(stepHours(0.33, 1)).toBe(0.42)
    expect(stepHours(minutesToHours(55), 1)).toBe(1)
    expect(stepHours(1, 1)).toBe(1.25)
    expect(stepHours(minutesToHours(80), 1)).toBe(1.5)
    expect(stepHours(1.25, -1)).toBe(1)
    expect(stepHours(1, -1)).toBe(minutesToHours(55))
    expect(stepHours(minutesToHours(80), -1)).toBe(1.25)
  })
})
