import { countdownLabel } from './countdown'

describe('countdownLabel', () => {
  it('counts days inside the first week, then switches to weeks', () => {
    expect(countdownLabel(1, 'en')).toBe('tomorrow')
    expect(countdownLabel(3, 'en')).toBe('in 3 days')
    expect(countdownLabel(6, 'en')).toBe('in 6 days')
    expect(countdownLabel(7, 'en')).toBe('next week')
    expect(countdownLabel(13, 'en')).toBe('next week')
    expect(countdownLabel(14, 'en')).toBe('in two weeks')
    expect(countdownLabel(20, 'en')).toBe('in two weeks')
    expect(countdownLabel(21, 'en')).toBe('in three weeks')
  })

  it('falls back to a month / months for far-off cleans', () => {
    expect(countdownLabel(30, 'en')).toBe('in a month')
    expect(countdownLabel(75, 'en')).toBe('in 3 months')
  })

  it('speaks Hebrew', () => {
    expect(countdownLabel(3, 'he')).toBe('בעוד 3 ימים')
    expect(countdownLabel(8, 'he')).toBe('בשבוע הבא')
    expect(countdownLabel(15, 'he')).toBe('בעוד שבועיים')
  })
})
