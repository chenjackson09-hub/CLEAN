import { notify, notifyChatMessage, profileNames } from './notifications'

function fakeAdmin(result: { error: { message: string } | null } = { error: null }, profiles: unknown[] = []) {
  const upsert = jest.fn(() => Promise.resolve(result))
  const admin = {
    upsert,
    from: (table: string) =>
      table === 'notifications'
        ? { upsert }
        : { select: () => ({ in: () => Promise.resolve({ data: profiles }) }) },
  }
  return admin
}

describe('notify', () => {
  it('writes one row per recipient, deduping only one-shot events tied to a booking', async () => {
    const admin = fakeAdmin()
    await notify(admin as never, [
      { userId: 'host', kind: 'request_accepted', bookingId: 'b1', href: '/bookings', once: true, data: { name: 'Noa R.' } },
      { userId: 'host', kind: 'availability_changed', bookingId: 'b1', href: '/bookings' },
    ])
    const [rows, opts] = admin.upsert.mock.calls[0] as unknown as [Record<string, unknown>[], Record<string, unknown>]
    expect(rows[0]).toMatchObject({ user_id: 'host', kind: 'request_accepted', dedupe_key: 'request_accepted:b1', href: '/bookings' })
    expect(rows[1]).toMatchObject({ kind: 'availability_changed', dedupe_key: null })
    expect(opts).toEqual({ onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
  })

  it('does nothing for an empty list or a missing recipient', async () => {
    const admin = fakeAdmin()
    await notify(admin as never, [])
    await notify(admin as never, { userId: '', kind: 'request_accepted', href: '/x' })
    expect(admin.upsert).not.toHaveBeenCalled()
  })

  it('never throws, so a missing table or write failure cannot break the action that triggered it', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(notify(fakeAdmin({ error: { message: 'relation does not exist' } }) as never, { userId: 'u', kind: 'request_accepted', href: '/x' })).resolves.toBeUndefined()
    const boom = { from: () => { throw new Error('down') } }
    await expect(notify(boom as never, { userId: 'u', kind: 'request_accepted', href: '/x' })).resolves.toBeUndefined()
  })
})

describe('profileNames', () => {
  it('maps ids to names and tolerates empty input', async () => {
    const admin = fakeAdmin({ error: null }, [{ id: 'a', full_name: 'Noa Rosen' }])
    expect((await profileNames(admin as never, ['a', 'a', ''])).get('a')).toBe('Noa Rosen')
    expect((await profileNames(admin as never, [])).size).toBe(0)
  })
})

describe('notifyChatMessage', () => {
  function chatAdmin(existing: { id: string; data: { count: number } }[]) {
    const upsert = jest.fn(() => Promise.resolve({ error: null }))
    const del = jest.fn(() => ({ eq: () => Promise.resolve({}) }))
    const chain: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'is', 'contains']) chain[m] = () => chain
    chain.limit = () => Promise.resolve({ data: existing })
    return { upsert, del, admin: { from: () => ({ ...chain, upsert, delete: del }) } }
  }
  const input = { recipientId: 'host', senderId: 'cl', conversationId: 'c1', name: 'Noa R.', href: '/chat/cl' }

  it('creates a first entry with count 1', async () => {
    const { admin, upsert, del } = chatAdmin([])
    await notifyChatMessage(admin as never, input)
    expect(del).not.toHaveBeenCalled()
    const [rows] = upsert.mock.calls[0] as unknown as [Record<string, unknown>[]]
    expect(rows[0]).toMatchObject({ user_id: 'host', kind: 'chat_message', data: { conversation: 'c1', count: 1 }, dedupe_key: null })
  })

  it('replaces an unread entry with a running count instead of adding another', async () => {
    const { admin, upsert, del } = chatAdmin([{ id: 'old', data: { count: 2 } }])
    await notifyChatMessage(admin as never, input)
    expect(del).toHaveBeenCalled()
    const [rows] = upsert.mock.calls[0] as unknown as [Record<string, unknown>[]]
    expect(rows[0]).toMatchObject({ data: { count: 3 } })
  })
})

describe('notify — the person a notification is about', () => {
  it('stores their profile picture with the notification', async () => {
    const admin = fakeAdmin({ error: null }, [{ id: 'maya', avatar_url: 'https://img/maya.jpg' }, { id: 'noavatar', avatar_url: null }])
    await notify(admin as never, [
      { userId: 'host', kind: 'request_accepted', actorId: 'maya', bookingId: 'b1', href: '/bookings', data: { name: 'Maya L.' } },
      { userId: 'host', kind: 'request_declined', actorId: 'noavatar', bookingId: 'b2', href: '/bookings', data: { name: 'Sam K.' } },
      { userId: 'host', kind: 'account_approved', href: '/browse' },
    ])
    const [rows] = admin.upsert.mock.calls[0] as unknown as [Record<string, unknown>[]]
    expect(rows[0].data).toEqual({ name: 'Maya L.', avatar: 'https://img/maya.jpg' })
    expect(rows[1].data).toEqual({ name: 'Sam K.' }) // no picture on file → the bell shows their initial
    expect(rows[2].data).toEqual({}) // system message, no person
  })
})
