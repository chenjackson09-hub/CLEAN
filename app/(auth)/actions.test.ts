import { signIn } from './actions'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>

const mockSignInWithPassword = jest.fn()
const mockGetUser = jest.fn()
const mockSingle = jest.fn()
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
  mockEq.mockReturnValue({ single: mockSingle })
  mockSignInWithPassword.mockResolvedValue({ error: null })
  mockedCreateClient.mockResolvedValue({
    auth: { signInWithPassword: mockSignInWithPassword, getUser: mockGetUser },
    from: mockFrom,
  } as any)
})

describe('signIn', () => {
  it('redirects a customer to /browse', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockSingle.mockResolvedValue({ data: { role: 'customer' } })

    await signIn(formData('a@b.com', 'pw'))

    expect(mockedRedirect).toHaveBeenCalledWith('/browse')
  })

  it('redirects a cleaner to /dashboard', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockSingle.mockResolvedValue({ data: { role: 'cleaner' } })

    await signIn(formData('a@b.com', 'pw'))

    expect(mockedRedirect).toHaveBeenCalledWith('/dashboard')
  })

  it('redirects an admin to /admin/applications', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockSingle.mockResolvedValue({ data: { role: 'admin' } })

    await signIn(formData('a@b.com', 'pw'))

    expect(mockedRedirect).toHaveBeenCalledWith('/admin/applications')
  })

  it('returns an error when sign in fails', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid credentials' } })

    const result = await signIn(formData('a@b.com', 'wrong'))

    expect(result).toEqual({ error: 'Invalid credentials' })
    expect(mockedRedirect).not.toHaveBeenCalled()
  })
})
