import { districtLabel, growthPct, isLocationStatus, resolvePeriod, searchKeys } from './locations'

const NOW = new Date('2026-10-15T12:00:00Z')

describe('resolvePeriod', () => {
  it('defaults to the last 30 days', () => {
    const p = resolvePeriod(undefined, undefined, undefined, NOW)
    expect(p.key).toBe('30d')
    expect(Math.round((p.until.getTime() - p.since.getTime()) / 86400000)).toBe(30)
  })
  it('handles the presets', () => {
    expect(resolvePeriod('7d', undefined, undefined, NOW).key).toBe('7d')
    expect(resolvePeriod('90d', undefined, undefined, NOW).key).toBe('90d')
    expect(resolvePeriod('all', undefined, undefined, NOW).since.getUTCFullYear()).toBe(2000)
  })
  it('takes a custom range inclusive of the last day', () => {
    const p = resolvePeriod('custom', '2026-10-01', '2026-10-07', NOW)
    expect(p.key).toBe('custom')
    expect(p.since.toISOString()).toBe('2026-10-01T00:00:00.000Z')
    expect(p.until.toISOString()).toBe('2026-10-08T00:00:00.000Z')
  })
  it('falls back to 30 days for a bad or reversed custom range', () => {
    expect(resolvePeriod('custom', 'nope', '2026-10-07', NOW).key).toBe('30d')
    expect(resolvePeriod('custom', '2026-10-09', '2026-10-01', NOW).key).toBe('30d')
  })
})

describe('searchKeys', () => {
  it('detects an official code', () => {
    expect(searchKeys(' 6700 ')).toEqual({ he: '', en: '', code: '6700' })
  })
  it('routes Hebrew and English to the right key', () => {
    expect(searchKeys('בית הלל').he).not.toBe('')
    expect(searchKeys('Beit Hillel').en).not.toBe('')
    expect(searchKeys('Beit Hillel').he).toBe('')
  })
  it('is empty for an empty query', () => {
    expect(searchKeys('  ')).toEqual({ he: '', en: '', code: '' })
  })
})

describe('growthPct', () => {
  it('is null without a baseline', () => expect(growthPct(5, 0)).toBeNull())
  it('computes percent change', () => {
    expect(growthPct(15, 10)).toBe(50)
    expect(growthPct(5, 10)).toBe(-50)
  })
})

describe('misc', () => {
  it('validates statuses', () => {
    expect(isLocationStatus('open')).toBe(true)
    expect(isLocationStatus('closed')).toBe(false)
  })
  it('labels districts in both languages', () => {
    expect(districtLabel('הצפון', 'en')).toBe('Northern District')
    expect(districtLabel('הצפון', 'he')).toBe('הצפון')
    expect(districtLabel(null, 'en')).toBe('—')
  })
})
