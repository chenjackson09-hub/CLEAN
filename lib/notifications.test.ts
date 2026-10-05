import { notify, profileNames } from './notifications'

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
