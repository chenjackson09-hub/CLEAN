import { describeNotification, relativeTime } from './notificationText'

describe('describeNotification', () => {
  it('writes a short English sentence with the person and a localized date', () => {
    expect(describeNotification('request_accepted', { name: 'Noa R.', date: '2026-10-17' }, 'en')).toBe(
      'Noa R. accepted your request for 17 October',
    )
    expect(describeNotification('request_received', { name: 'Dana Levi', date: '2026-10-17', time: '09:00' }, 'en')).toBe(
      'Dana Levi requested a clean on 17 October at 09:00',
    )
  })

  it('includes the new times and the score where relevant', () => {
    expect(describeNotification('availability_changed', { name: 'Noa R.', date: '2026-10-17', times: '10:00–13:00' }, 'en')).toContain(
      'changed their available times to 10:00–13:00',
    )
    expect(describeNotification('rating_received', { name: 'Dana', score: 5 }, 'en')).toBe('Dana rated you 5★')
  })

  it('follows the viewer language', () => {
    const he = describeNotification('request_accepted', { name: 'נועה', date: '2026-10-17' }, 'he')
    expect(he).toContain('נועה')
    expect(he).not.toContain('accepted')
  })

  it('returns an empty string for an unknown kind so the bell can skip it', () => {
    expect(describeNotification('something_new', {}, 'en')).toBe('')
  })
})

describe('relativeTime', () => {
  const now = new Date('2026-10-05T12:00:00Z')
  it('is short and Facebook-style', () => {
    expect(relativeTime('2026-10-05T11:59:40Z', now, 'en')).toBe('just now')
    expect(relativeTime('2026-10-05T11:55:00Z', now, 'en')).toBe('5m')
    expect(relativeTime('2026-10-05T09:00:00Z', now, 'en')).toBe('3h')
    expect(relativeTime('2026-10-04T09:00:00Z', now, 'en')).toBe('Yesterday')
    expect(relativeTime('2026-10-01T12:00:00Z', now, 'en')).toBe('4d')
  })
})
