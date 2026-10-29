import { signIn, completeOnboarding } from './actions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockedCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>
const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>

const mockSignInWithPassword = jest.fn()
const mockSingle = jest.fn()
const mockMaybeSingle = jest.fn()
const mockEq = jest.fn()
const mockSelect = jest.fn()
const mockFrom = jest.fn()

function formData(email: string, password: string) {
  const fd = new FormData()
  fd.set('email', email)
  fd.set('password', password)
  return fd
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFrom.mockReturnValue({ select: mockSelect })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockEq.mockReturnValue({ single: mockSingle, maybeSingle: mockMaybeSingle })
  // By default the sign-up counts as finished (every existing account is).
  mockMaybeSingle.mockResolvedValue({ data: { onboarding_completed_at: '2026-10-01T00:00:00Z' }, error: null })
  // signIn reads the authenticated user from signInWithPassword's result.
  mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  mockedCreateClient.mockResolvedValue({
    auth: { signInWithPassword: mockSignInWithPassword },
    from: mockFrom,
  } as never)
})

describe('signIn — unfinished sign-ups resume in their wizard', () => {
  it('sends a cleaner whose sign-up was never submitted back to the cleaner wizard', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'cleaner' } })
    mockMaybeSingle.mockResolvedValue({ data: { onboarding_completed_at: null }, error: null })
    await signIn(formData('a@b.com', 'pw'))
    expect(mockedRedirect).toHaveBeenCalledWith('/register/cleaner')
  })
  it('sends an unfinished host to the host wizard', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'customer' } })
    mockMaybeSingle.mockResolvedValue({ data: { onboarding_completed_at: null }, error: null })
    await signIn(formData('a@b.com', 'pw'))
    expect(mockedRedirect).toHaveBeenCalledWith('/register/customer')
  })
  it('a database without the column (or any error) never blocks sign-in', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'customer' } })
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'column does not exist' } })
    await signIn(formData('a@b.com', 'pw'))
    expect(mockedRedirect).toHaveBeenCalledWith('/browse')
  })
  it('never sends an admin to a wizard', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'admin' } })
    mockMaybeSingle.mockResolvedValue({ data: { onboarding_completed_at: null }, error: null })
    await signIn(formData('a@b.com', 'pw'))
    expect(mockedRedirect).toHaveBeenCalledWith('/admin/dashboard')
  })
})

describe('signIn', () => {
  it('redirects a customer to /browse', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'customer' } })

    await signIn(formData('a@b.com', 'pw'))

    expect(mockedRedirect).toHaveBeenCalledWith('/browse')
  })

  it('redirects a cleaner to /cleaner/dashboard', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'cleaner' } })

    await signIn(formData('a@b.com', 'pw'))

    expect(mockedRedirect).toHaveBeenCalledWith('/cleaner/dashboard')
  })

  it('redirects an admin to /admin/dashboard', async () => {
    mockSingle.mockResolvedValue({ data: { role: 'admin' } })

    await signIn(formData('a@b.com', 'pw'))

    expect(mockedRedirect).toHaveBeenCalledWith('/admin/dashboard')
  })

  it('returns an error when sign in fails', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid credentials' } })

    const result = await signIn(formData('a@b.com', 'wrong'))

    expect(result).toEqual({ error: 'Invalid credentials' })
    expect(mockedRedirect).not.toHaveBeenCalled()
  })
})

describe('completeOnboarding', () => {
  const mockGetUser = jest.fn()
  const mockUpsert = jest.fn()
  const mockAdminEq = jest.fn()
  const mockAdminSelect = jest.fn()
  const mockAdminFrom = jest.fn()
  const mockUpdateUserById = jest.fn()

  function googleUser(overrides: Record<string, unknown> = {}) {
    return {
      id: 'u1',
      app_metadata: { providers: ['google'] },
      user_metadata: {},
      ...overrides,
    }
  }

  beforeEach(() => {
    mockGetUser.mockReset()
    mockUpsert.mockReset().mockResolvedValue({ error: null })
    mockAdminEq.mockReset().mockResolvedValue({ data: [], error: null })
    mockAdminSelect.mockReset().mockReturnValue({ eq: mockAdminEq, limit: mockAdminEq })
    mockAdminFrom.mockReset().mockReturnValue({
      upsert: mockUpsert,
      delete: () => ({ eq: jest.fn().mockResolvedValue({ error: null }) }),
      select: mockAdminSelect,
      insert: jest.fn().mockResolvedValue({ error: null }),
    })
    mockUpdateUserById.mockReset().mockResolvedValue({ error: null })

    mockedCreateClient.mockResolvedValue({
      auth: { getUser: mockGetUser },
    } as never)
    mockedCreateAdminClient.mockReturnValue({
      from: mockAdminFrom,
      auth: { admin: { updateUserById: mockUpdateUserById } },
    } as never)
  })

  it('blocks an email/password user even if they have never onboarded', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'u1', app_metadata: { providers: ['email'] }, user_metadata: {} } },
    })

    const result = await completeOnboarding({ role: 'customer', full_name: 'A', phone: '' })

    expect(result.error).toMatch(/already been completed/)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('blocks a Google user who already onboarded', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: googleUser({ user_metadata: { onboarded: true } }) },
    })

    const result = await completeOnboarding({ role: 'cleaner', full_name: 'A', phone: '' })

    expect(result.error).toMatch(/already been completed/)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('allows a fresh Google-only user who has not onboarded yet', async () => {
    mockGetUser.mockResolvedValue({ data: { user: googleUser() } })

    const result = await completeOnboarding({ role: 'customer', full_name: 'A', phone: '' })

    expect(result).toEqual({ success: true })
    expect(mockUpsert).toHaveBeenCalled()
  })
})
