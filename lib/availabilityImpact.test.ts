import { findAffectedRequests, formatSlotTimes, isCovered } from './availabilityImpact'

const req = (id: string, start: string, h: number) => ({ id, scheduled_start: start, duration_hours: h })
const slot = (a: string, b: string) => ({ start_time: a, end_time: b })

describe('availability impact', () => {
  it('a request is covered only when one slot fully contains start..start+duration', () => {
    expect(isCovered(req('a', '10:00:00', 3), [slot('09:00:00', '13:00:00')])).toBe(true)
    expect(isCovered(req('a', '10:00:00', 4), [slot('09:00:00', '13:00:00')])).toBe(false)
    expect(isCovered(req('a', '08:00:00', 1), [slot('09:00:00', '13:00:00')])).toBe(false)
  })

  it('deleting the only slot breaks the requests it covered', () => {
    const before = [slot('09:00', '15:00')]
    const hit = findAffectedRequests([req('a', '10:00', 2)], before, [])
    expect(hit.map((r) => r.id)).toEqual(['a'])
  })

  it('shrinking a slot breaks only the requests that no longer fit', () => {
    const before = [slot('09:00', '15:00')]
    const after = [slot('09:00', '12:00')]
    const hit = findAffectedRequests([req('fits', '09:00', 2), req('out', '11:00', 3)], before, after)
    expect(hit.map((r) => r.id)).toEqual(['out'])
  })

  it('does not blame the change for a request that was never covered', () => {
    expect(findAffectedRequests([req('x', '18:00', 2)], [slot('09:00', '12:00')], [])).toEqual([])
  })

  it('a request still covered by another slot is not affected', () => {
    const before = [slot('09:00', '12:00'), slot('09:00', '15:00')]
    expect(findAffectedRequests([req('a', '10:00', 2)], before, [slot('09:00', '15:00')])).toEqual([])
  })

  it('formats the remaining times sorted', () => {
    expect(formatSlotTimes([slot('15:00:00', '17:00:00'), slot('10:00:00', '13:00:00')])).toBe('10:00–13:00, 15:00–17:00')
  })
})
