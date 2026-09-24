import { buildTimeline, formatBookingDate, formatDividerLabel, mergeMessages, shortName, type ChatBookingCard, type ChatMessage } from './chatFormat'

const msg = (id: string, iso: string, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id, sender_id: 'u1', body: id, created_at: iso, ...extra,
})
const card = (id: string, iso: string): ChatBookingCard => ({
  booking_id: id, attached_at: iso, status: 'accepted', scheduled_date: '2026-06-17',
  scheduled_start: '09:00:00', address: 'Kibbutz Amir', hourly_rate: 90,
})

describe('shortName', () => {
  it('shortens to first name + last initial', () => {
    expect(shortName('Noa Rosen')).toBe('Noa R.')
    expect(shortName('Noa')).toBe('Noa')
  })
})

describe('mergeMessages', () => {
  it('dedupes by id', () => {
    const a = msg('1', '2026-06-14T10:00:00Z')
    expect(mergeMessages([a], [a, msg('2', '2026-06-14T10:01:00Z')])).toHaveLength(2)
  })

  it('replaces the optimistic message with the server row (matched by client_id)', () => {
    const optimistic = msg('local-c1', '2026-06-14T10:00:00Z', { client_id: 'c1', status: 'sending' })
    const server = msg('real-1', '2026-06-14T10:00:01Z', { client_id: 'c1' })
    const merged = mergeMessages([optimistic], [server])
    expect(merged).toHaveLength(1)
    expect(merged[0].id).toBe('real-1')
    expect(merged[0].status).toBeUndefined()
  })
})

describe('buildTimeline', () => {
  it('orders messages and cards chronologically, cards not pinned to the end', () => {
    const items = buildTimeline(
      [msg('m1', '2026-06-14T10:00:00Z'), msg('m3', '2026-06-16T10:00:00Z')],
      [card('b1', '2026-06-15T10:00:00Z')],
      false
    )
    expect(items.map((i) => i.key)).toEqual(['m-m1', 'c-b1', 'm-m3'])
  })

  it('puts a card before a message with the same timestamp', () => {
    const items = buildTimeline([msg('m1', '2026-06-15T10:00:00Z')], [card('b1', '2026-06-15T10:00:00Z')], false)
    expect(items.map((i) => i.key)).toEqual(['c-b1', 'm-m1'])
  })

  it('inserts one divider per local calendar day', () => {
    const d1 = new Date(2026, 4, 26, 12).toISOString()
    const d1b = new Date(2026, 4, 26, 13).toISOString()
    const d2 = new Date(2026, 5, 14, 9).toISOString()
    const items = buildTimeline([msg('a', d1), msg('b', d1b), msg('c', d2)], [], true)
    expect(items.map((i) => i.kind)).toEqual(['divider', 'message', 'message', 'divider', 'message'])
  })

  it('splits days by the viewer\'s local midnight, not UTC', () => {
    const before = new Date(2026, 5, 14, 23, 59).toISOString()
    const after = new Date(2026, 5, 15, 0, 1).toISOString()
    const items = buildTimeline([msg('a', before), msg('b', after)], [], true)
    expect(items.filter((i) => i.kind === 'divider')).toHaveLength(2)
  })
})

describe('date formatting', () => {
  it('labels today with "Today, "', () => {
    const now = new Date(2026, 5, 14, 15)
    expect(formatDividerLabel(new Date(2026, 5, 14, 9), now, 'en')).toBe('Today, 14 June')
    expect(formatDividerLabel(new Date(2026, 4, 26, 9), now, 'en')).toBe('26 May')
  })

  it('formats a booking date without timezone drift', () => {
    expect(formatBookingDate('2026-06-17', 'en')).toBe('17 June')
  })
})
