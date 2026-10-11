import { saveRating } from './ratings'

// A tiny in-memory ratings table with the uniqueness rules of both database
// versions, so the real branching in saveRating runs.
type Row = { id: string; booking_id: string; rater_id: string; ratee_id: string; score: number; review_text?: string | null }
function fakeDb(rows: Row[], mode: 'per-booking' | 'per-person') {
  let n = 0
  const table = rows
  return {
    table,
    from() {
      let filters: [string, unknown][] = []
      let patch: Record<string, unknown> | null = null
      const matches = () => table.filter((r) => filters.every(([k, v]) => (r as Record<string, unknown>)[k] === v))
      const api: Record<string, unknown> = {
        update: (p: Record<string, unknown>) => { patch = p; return api },
        eq: (k: string, v: unknown) => { filters.push([k, v]); return api },
        select: () => {
          const hit = matches()
          if (patch) hit.forEach((r) => Object.assign(r, patch))
          return Promise.resolve({ data: hit.map((r) => ({ id: r.id })), error: null })
        },
        insert: (row: Omit<Row, 'id'>) => {
          const clash = table.some((r) =>
            mode === 'per-booking'
              ? r.booking_id === row.booking_id && r.rater_id === row.rater_id
              : r.rater_id === row.rater_id && r.ratee_id === row.ratee_id,
          )
          if (clash) return Promise.resolve({ error: { code: '23505', message: 'duplicate key' } })
          table.push({ id: `r${++n}`, ...row } as Row)
          return Promise.resolve({ error: null })
        },
        then: (res: (v: unknown) => unknown) => {
          // an update with no .select(): apply and resolve
          const hit = matches()
          if (patch) hit.forEach((r) => Object.assign(r, patch))
          return Promise.resolve({ error: null }).then(res)
        },
      }
      return api
    },
  }
}

const base = { raterId: 'host', rateeId: 'maya', rateeRole: 'cleaner' as const }

describe('saveRating', () => {
  it('each clean is its own rating, so six cleans give six ratings', async () => {
    const db = fakeDb([], 'per-booking')
    for (let i = 1; i <= 6; i++) await saveRating(db as never, { ...base, bookingId: `b${i}`, score: 5 })
    expect(db.table).toHaveLength(6)
    expect(db.table.every((r) => r.score === 5)).toBe(true)
  })

  it('rating the same clean again edits it instead of adding another', async () => {
    const db = fakeDb([], 'per-booking')
    await saveRating(db as never, { ...base, bookingId: 'b1', score: 3 })
    await saveRating(db as never, { ...base, bookingId: 'b1', score: 5 })
    expect(db.table).toHaveLength(1)
    expect(db.table[0].score).toBe(5)
  })

  it('keeps an existing review text when only the stars change, and sets it when given', async () => {
    const db = fakeDb([{ id: 'x', booking_id: 'b1', rater_id: 'host', ratee_id: 'maya', score: 4, review_text: 'Lovely' }], 'per-booking')
    await saveRating(db as never, { ...base, bookingId: 'b1', score: 5 })
    expect(db.table[0].review_text).toBe('Lovely')
    await saveRating(db as never, { ...base, bookingId: 'b1', score: 5, reviewText: '  Spotless  ' })
    expect(db.table[0].review_text).toBe('Spotless')
  })

  it('before migration 0038 (one rating per person) it updates that rating instead of failing', async () => {
    const db = fakeDb([{ id: 'x', booking_id: 'old', rater_id: 'host', ratee_id: 'maya', score: 4 }], 'per-person')
    const res = await saveRating(db as never, { ...base, bookingId: 'b2', score: 5 })
    expect(res.error).toBeUndefined()
    expect(db.table).toHaveLength(1)
    expect(db.table[0]).toMatchObject({ booking_id: 'b2', score: 5 })
  })
})
