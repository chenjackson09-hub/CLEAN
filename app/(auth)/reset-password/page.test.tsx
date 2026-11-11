import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import ResetPasswordPage from './page'

const mockPush = jest.fn()
let search = 'email=a%40b.com'
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}))

const mockVerify = jest.fn()
const mockUpdate = jest.fn()
const mockSignOut = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      verifyOtp: (...a: unknown[]) => mockVerify(...a),
      updateUser: (...a: unknown[]) => mockUpdate(...a),
      signOut: (...a: unknown[]) => mockSignOut(...a),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
}))

async function fill(code = '123456', pw = 'newpass1', confirm = 'newpass1') {
  await userEvent.type(screen.getByLabelText(/code from the email/i), code)
  await userEvent.type(screen.getByLabelText(/^new password/i), pw)
  await userEvent.type(screen.getByLabelText(/confirm new password/i), confirm)
  await userEvent.click(screen.getByRole('button', { name: /change password/i }))
}

beforeEach(() => {
  jest.clearAllMocks()
  search = 'email=a%40b.com'
  mockVerify.mockResolvedValue({ data: { session: {}, user: {} }, error: null })
  mockUpdate.mockResolvedValue({ error: null })
  mockSignOut.mockResolvedValue({})
})

describe('ResetPasswordPage', () => {
  it('checks the code, sets the password, signs out and goes to login', async () => {
    render(<ResetPasswordPage />)
    await fill()
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login?reset=1'))
    expect(mockVerify).toHaveBeenCalledWith({ email: 'a@b.com', token: '123456', type: 'recovery' })
    expect(mockUpdate).toHaveBeenCalledWith({ password: 'newpass1' })
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('does not call Supabase when the two passwords differ', async () => {
    render(<ResetPasswordPage />)
    await fill('123456', 'newpass1', 'other999')
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(mockVerify).not.toHaveBeenCalled()
  })

  it('does not call Supabase when the password is too short', async () => {
    render(<ResetPasswordPage />)
    await fill('123456', 'abc', 'abc')
    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument()
    expect(mockVerify).not.toHaveBeenCalled()
  })

  it('shows a wrong-code message and never changes the password', async () => {
    mockVerify.mockResolvedValue({ data: { session: null, user: null }, error: { message: 'Token has expired or is invalid' } })
    render(<ResetPasswordPage />)
    await fill()
    expect(await screen.findByText(/wrong or has expired/i)).toBeInTheDocument()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('says so when the new password equals the old one, and signs out again', async () => {
    mockUpdate.mockResolvedValue({ error: { code: 'same_password', message: 'New password should be different from the old password.' } })
    render(<ResetPasswordPage />)
    await fill()
    expect(await screen.findByText(/different from your old one/i)).toBeInTheDocument()
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('asks to start over when there is no email in the link', () => {
    search = ''
    render(<ResetPasswordPage />)
    expect(screen.getByText(/need your email address/i)).toBeInTheDocument()
  })
})
