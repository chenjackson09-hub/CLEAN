import { sendMessage } from './chat'

const mockInsert = jest.fn()
const mockSelectExisting = jest.fn()
let user: { id: string } | null = { id: 'session-user' }

jest.mock('@/lib/supabase/server', () => ({
  getCurrentUser: async () => user,
  createClient: async () => ({
    from: () => ({
      insert: (row: unknown) => ({ select: () => ({ single: () => mockInsert(row) }) }),
      select: () => ({ eq: () => ({ eq: () => ({ single: () => mockSelectExisting() }) }) }),
    }),
  }),
}))

const CONV = '11111111-1111-4111-8111-111111111111'
const CLIENT = '22222222-2222-4222-8222-222222222222'

describe('sendMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    user = { id: 'session-user' }
  })

  it('rejects empty and whitespace-only messages without touching the db', async () => {
    expect(await sendMessage(CONV, '   ', CLIENT)).toEqual({ error: 'Please enter a message.' })
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('requires a signed-in user', async () => {
    user = null
    expect(await sendMessage(CONV, 'hi', CLIENT)).toEqual({ error: 'You must be signed in.' })
  })

  it('stamps the sender from the session, never from the client', async () => {
    mockInsert.mockResolvedValue({ data: { id: 'm1', sender_id: 'session-user', body: 'hi', created_at: 'x', client_id: CLIENT }, error: null })
    const res = await sendMessage(CONV, '  hi  ', CLIENT)
    expect(mockInsert).toHaveBeenCalledWith({ conversation_id: CONV, sender_id: 'session-user', body: 'hi', client_id: CLIENT })
    expect('message' in res && res.message.id).toBe('m1')
  })

  it('returns the stored row when the same client_id is retried (no duplicate)', async () => {
    mockInsert.mockResolvedValue({ data: null, error: { code: '23505' } })
    mockSelectExisting.mockResolvedValue({ data: { id: 'm1', sender_id: 'session-user', body: 'hi', created_at: 'x', client_id: CLIENT } })
    const res = await sendMessage(CONV, 'hi', CLIENT)
    expect('message' in res && res.message.id).toBe('m1')
  })

  it('surfaces a failure (e.g. RLS rejecting a non-participant)', async () => {
    mockInsert.mockResolvedValue({ data: null, error: { code: '42501' } })
    const res = await sendMessage(CONV, 'hi', CLIENT)
    expect('error' in res).toBe(true)
  })

  it('rejects malformed ids', async () => {
    expect(await sendMessage('nope', 'hi', CLIENT)).toEqual({ error: 'Invalid request.' })
  })
})
