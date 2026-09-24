import { ensureBookingInConversation, findOrCreateConversation, loadChatThread, syncConversationForPair } from './chat'

type Call = [string, unknown[]]

// Minimal chainable/thenable stand-in for a supabase query builder.
function fakeClient(results: Record<string, unknown>) {
  const calls: { table: string; ops: Call[] }[] = []
  const client = {
    calls,
    from(table: string) {
      const entry = { table, ops: [] as Call[] }
      calls.push(entry)
      const chain: unknown = new Proxy({}, {
        get(_t, prop: string) {
          if (prop === 'then') return (resolve: (v: unknown) => void) => resolve(results[table] ?? { data: null, error: null })
          return (...args: unknown[]) => {
            entry.ops.push([prop, args])
            return chain
          }
        },
      })
      return chain
    },
  }
  return client
}

const upserts = (c: ReturnType<typeof fakeClient>, table: string) =>
  c.calls.filter((x) => x.table === table).flatMap((x) => x.ops.filter(([op]) => op === 'upsert'))

describe('conversation find-or-create', () => {
  it('upserts on the (host, cleaner) pair ignoring duplicates, then reads the id back', async () => {
    const admin = fakeClient({ conversations: { data: { id: 'conv-1' }, error: null } })
    const id = await findOrCreateConversation(admin as never, 'host-1', 'cleaner-1')
    expect(id).toBe('conv-1')
    const [, args] = upserts(admin, 'conversations')[0]
    expect(args[0]).toEqual({ host_id: 'host-1', cleaner_id: 'cleaner-1' })
    expect(args[1]).toEqual({ onConflict: 'host_id,cleaner_id', ignoreDuplicates: true })
  })

  it('returns null when the write fails', async () => {
    const admin = fakeClient({ conversations: { data: null, error: { message: 'boom' } } })
    expect(await findOrCreateConversation(admin as never, 'h', 'c')).toBeNull()
  })
})

describe('ensureBookingInConversation', () => {
  it('attaches the booking once via an ignore-duplicates upsert keyed on booking_id', async () => {
    const admin = fakeClient({ conversations: { data: { id: 'conv-1' }, error: null } })
    const booking = { id: 'b1', customer_id: 'host-1', cleaner_id: 'cleaner-1', responded_at: '2026-06-14T10:00:00Z' }

    await ensureBookingInConversation(admin as never, booking)
    await ensureBookingInConversation(admin as never, booking) // retried approval

    const attach = upserts(admin, 'conversation_bookings')
    expect(attach).toHaveLength(2)
    for (const [, args] of attach) {
      expect(args[0]).toMatchObject({ conversation_id: 'conv-1', booking_id: 'b1' })
      expect(args[1]).toEqual({ onConflict: 'booking_id', ignoreDuplicates: true })
    }
  })
})

describe('syncConversationForPair', () => {
  it('reports no relationship when the pair has no accepted/completed booking', async () => {
    const admin = fakeClient({ bookings: { data: [], error: null } })
    expect(await syncConversationForPair(admin as never, 'h', 'c')).toBe(false)
    expect(upserts(admin, 'conversations')).toHaveLength(0)
  })

  it('reuses one conversation for several bookings with the same cleaner', async () => {
    const admin = fakeClient({
      bookings: {
        data: [
          { id: 'b1', customer_id: 'h', cleaner_id: 'c', responded_at: null },
          { id: 'b2', customer_id: 'h', cleaner_id: 'c', responded_at: null },
        ],
        error: null,
      },
      conversations: { data: { id: 'conv-1' }, error: null },
    })
    expect(await syncConversationForPair(admin as never, 'h', 'c')).toBe(true)
    const attached = upserts(admin, 'conversation_bookings').map(([, a]) => (a[0] as { conversation_id: string }).conversation_id)
    expect(attached).toEqual(['conv-1', 'conv-1'])
  })
})

describe('loadChatThread', () => {
  it('returns null for a non-participant (RLS hides the conversation)', async () => {
    const admin = fakeClient({ bookings: { data: [], error: null } })
    const supabase = fakeClient({ conversations: { data: null, error: null } })
    const thread = await loadChatThread({
      supabase: supabase as never, admin: admin as never, userId: 'stranger', role: 'host', otherId: 'cleaner-1',
    })
    expect(thread).toBeNull()
  })

  it('builds the thread from real booking/profile/rate data', async () => {
    const admin = fakeClient({
      bookings: { data: [], error: null },
      profiles: { data: { full_name: 'Noa Rosen', avatar_url: 'http://img/a.jpg' }, error: null },
      cleaners: { data: { hourly_rate: 90 }, error: null },
      conversation_bookings: {
        data: [{ booking_id: 'b1', created_at: '2026-06-14T10:00:00Z', bookings: { status: 'accepted', scheduled_date: '2026-06-17', scheduled_start: '09:00:00', address: 'Kibbutz Amir' } }],
        error: null,
      },
    })
    const supabase = fakeClient({
      conversations: { data: { id: 'conv-1' }, error: null },
      messages: { data: [{ id: 'm2', sender_id: 'c', body: 'hi', created_at: '2026-06-14T11:00:00Z', client_id: null }, { id: 'm1', sender_id: 'h', body: 'yo', created_at: '2026-06-14T10:30:00Z', client_id: null }], error: null },
    })
    const thread = await loadChatThread({
      supabase: supabase as never, admin: admin as never, userId: 'h', role: 'host', otherId: 'c',
    })
    expect(thread?.other).toEqual({ id: 'c', name: 'Noa Rosen', avatarUrl: 'http://img/a.jpg' })
    expect(thread?.messages.map((m) => m.id)).toEqual(['m1', 'm2'])
    expect(thread?.cards[0]).toMatchObject({ booking_id: 'b1', status: 'accepted', scheduled_date: '2026-06-17', hourly_rate: 90, address: 'Kibbutz Amir' })
  })
})
