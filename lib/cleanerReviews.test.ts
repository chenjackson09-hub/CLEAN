import { fetchCleanerReviews } from './cleanerReviews'

const admin = (result: { data: unknown; error: unknown }) => {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'not', 'order']) q[m] = () => q
  q.limit = async () => result
  return { from: () => q } as never
}

describe('fetchCleanerReviews', () => {
  it('returns reviews with the host as "First L." only', async () => {
    const out = await fetchCleanerReviews(admin({ error: null, data: [
      { id: '1', score: 5, review_text: 'Great job', rater: { full_name: 'Dana Cohen Levi' } },
      { id: '2', score: 4, review_text: '  ', rater: { full_name: 'X Y' } },
      { id: '3', score: 3, review_text: 'Fine', rater: null },
    ] }), 'c1')
    expect(out).toEqual([
      { id: '1', score: 5, reviewText: 'Great job', reviewerName: 'Dana L.' },
      { id: '3', score: 3, reviewText: 'Fine', reviewerName: 'A host' },
    ])
  })
  it('fails open: an error means no reviews, not a broken page', async () => {
    expect(await fetchCleanerReviews(admin({ error: { message: 'boom' }, data: null }), 'c1')).toEqual([])
  })
})
