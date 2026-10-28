import { fetchCindyVerified } from './cindyVerified'

function client(result: { data?: unknown; error?: unknown } | 'throw') {
  const calls: string[] = []
  const q: Record<string, unknown> = {}
  q.select = () => q
  q.not = () => { calls.push('not'); return q }
  q.in = () => { calls.push('in'); return q }
  q.limit = () => (result === 'throw' ? Promise.reject(new Error('x')) : Promise.resolve({ data: result.data ?? [], error: result.error ?? null }))
  return { c: { from: () => { if (result === 'throw') throw new Error('boom'); return q } } as never, calls }
}

describe('fetchCindyVerified', () => {
  it('maps verified people to when they were verified', async () => {
    const { c } = client({ data: [{ id: 'a', cindy_verified_at: '2026-10-01T00:00:00Z' }, { id: 'b', cindy_verified_at: null }] })
    expect(Array.from((await fetchCindyVerified(c, 'cleaners')).entries())).toEqual([['a', '2026-10-01T00:00:00Z']])
  })
  it('asks only about the given people when there are few', async () => {
    const { c, calls } = client({ data: [] })
    await fetchCindyVerified(c, 'customers', ['a', 'b'])
    expect(calls).toContain('in')
  })
  it('does nothing for an empty id list', async () => {
    const { c, calls } = client({ data: [] })
    expect((await fetchCindyVerified(c, 'customers', [])).size).toBe(0)
    expect(calls).toEqual([])
  })
  it('fails open: an error (migration not applied) or a throw means no badge, not a crash', async () => {
    expect((await fetchCindyVerified(client({ error: { message: 'column does not exist' } }).c, 'cleaners')).size).toBe(0)
    expect((await fetchCindyVerified(client('throw').c, 'cleaners')).size).toBe(0)
  })
})
