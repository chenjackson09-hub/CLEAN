import { deadlineLabel } from './deadline'

const min = 60_000
describe('deadlineLabel', () => {
  it('rounds a fresh request down to whole hours, calmly', () => {
    expect(deadlineLabel(23 * 60 * min + 52 * min)).toEqual({ kind: 'hours', n: 23, tone: 'calm' })
  })
  it('turns amber under 6 hours', () => {
    expect(deadlineLabel(5 * 60 * min + 10 * min)).toEqual({ kind: 'hours', n: 5, tone: 'soon' })
  })
  it('only counts minutes in the last hour, and flags it', () => {
    expect(deadlineLabel(45 * min)).toEqual({ kind: 'minutes', n: 45, tone: 'urgent' })
    expect(deadlineLabel(10_000)).toEqual({ kind: 'minutes', n: 1, tone: 'urgent' })
  })
  it('expired when time is up', () => {
    expect(deadlineLabel(0)).toEqual({ kind: 'expired' })
    expect(deadlineLabel(-5)).toEqual({ kind: 'expired' })
  })
})
