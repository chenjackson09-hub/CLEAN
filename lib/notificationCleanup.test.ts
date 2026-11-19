import { clearSettledRequestNotifications } from './notificationCleanup'

// A tiny fake of the two tables the helper touches.
function fake(pending: Record<string, boolean>) {
  const updates: { filters: Record<string, unknown>; kinds?: string[] }[] = []
  const admin = {
    from: (table: string) => {
      if (table === 'bookings') {
        const f: Record<string, string> = {}
        const chain: Record<string, unknown> = {}
        chain.select = () => chain
        chain.eq = (k: string, v: string) => { f[k] = v; return chain }
        chain.limit = () => Promise.resolve({ data: pending[`${f.cleaner_id}:${f.customer_id}`] ? [{ id: 'b' }] : [], error: null })
        return chain
      }
      const filters: Record<string, unknown> = {}
      const rec: { filters: Record<string, unknown>; kinds?: string[] } = { filters }
      const chain: Record<string, unknown> = {}
      chain.update = (v: unknown) => { filters.set = v; updates.push(rec); return chain }
      chain.eq = (k: string, v: unknown) => { filters[k] = v; return chain }
      chain.in = (_k: string, v: string[]) => { rec.kinds = v; return chain }
      chain.is = () => Promise.resolve({ error: null })
      return chain
    },
  }
  return { admin, updates }
}

describe('clearSettledRequestNotifications', () => {
  it('marks the cleaner’s request entries read once nothing is pending from that host', async () => {
    const { admin, updates } = fake({})
    await clearSettledRequestNotifications(admin as never, [{ cleanerId: 'c1', hostId: 'h1' }])
    expect(updates).toHaveLength(1)
    expect(updates[0].filters).toMatchObject({ user_id: 'c1', actor_id: 'h1' })
    expect(updates[0].kinds).toEqual(['request_received', 'request_expiring'])
  })

  it('leaves them alone while another request from that host is still pending (e.g. other flexible days)', async () => {
    const { admin, updates } = fake({ 'c1:h1': true })
    await clearSettledRequestNotifications(admin as never, [{ cleanerId: 'c1', hostId: 'h1' }])
    expect(updates).toHaveLength(0)
  })

  it('handles each cleaner/host pair once and never throws', async () => {
    const { admin, updates } = fake({})
    await clearSettledRequestNotifications(admin as never, [
      { cleanerId: 'c1', hostId: 'h1' },
      { cleanerId: 'c1', hostId: 'h1' },
      { cleanerId: 'c2', hostId: 'h1' },
    ])
    expect(updates).toHaveLength(2)
    jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(clearSettledRequestNotifications({ from: () => { throw new Error('down') } } as never, [{ cleanerId: 'a', hostId: 'b' }])).resolves.toBeUndefined()
  })
})
