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

describe('chat and reminder notifications', () => {
  it('groups chat messages into a count', () => {
    expect(describeNotification('chat_message', { name: 'Noa R.', count: 1 }, 'en')).toBe('Noa R. sent you a message')
    expect(describeNotification('chat_message', { name: 'Noa R.', count: 3 }, 'en')).toBe('Noa R. sent you 3 messages')
  })
  it('describes the clean-tomorrow and expiring reminders', () => {
    expect(describeNotification('clean_tomorrow', { name: 'Noa R.', time: '09:00' }, 'en')).toBe('Reminder: your clean with Noa R. is tomorrow at 09:00')
    expect(describeNotification('request_expiring', { name: 'Host One', date: '2026-10-20' }, 'en')).toContain('about to expire')
  })
})

describe('cancellation notifications', () => {
  it('tells the cleaner a host cancelled and that their time is open again', () => {
    expect(describeNotification('booking_cancelled_by_host', { name: 'Chen Jackson', date: '2026-10-13', time: '10:00' }, 'en')).toBe(
      'Chen Jackson cancelled the cleaning scheduled for 13 October at 10:00. Your availability for this time has been reopened.',
    )
  })
  it('tells the host the cleaner cancelled and points at finding another', () => {
    expect(describeNotification('booking_cancelled_by_cleaner', { name: 'Maya L.', date: '2026-10-13', time: '10:00' }, 'en')).toBe(
      'Maya L. had to cancel your cleaning on 13 October at 10:00. Tap to find another cleaner.',
    )
  })
  it('still reads fine for older notifications without a time', () => {
    expect(describeNotification('booking_cancelled_by_cleaner', { name: 'Maya L.', date: '2026-10-13' }, 'en')).toBe(
      'Maya L. had to cancel your cleaning on 13 October. Tap to find another cleaner.',
    )
  })
})
