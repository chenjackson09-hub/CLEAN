import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import VerifyPage from './page'

const mockPush = jest.fn()
let search = 'email=a%40b.com'
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(search),
}))

const mockVerify = jest.fn()
const mockResend = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { verifyOtp: (...a: unknown[]) => mockVerify(...a), resend: (...a: unknown[]) => mockResend(...a) } }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  search = 'email=a%40b.com'
  mockResend.mockResolvedValue({ error: null })
})

describe('Verify email code', () => {
  it('checks the code and continues into the wizard for the role', async () => {
    mockVerify.mockResolvedValue({ data: { session: { access_token: 't' }, user: { user_metadata: { role: 'customer' } } }, error: null })
    const user = userEvent.setup()
    render(<VerifyPage />)
    expect(screen.getByRole('button', { name: 'Verify' })).toBeDisabled()
    await user.type(screen.getByLabelText(/verification code/i), '123456')
    await user.click(screen.getByRole('button', { name: 'Verify' }))
    await waitFor(() => expect(mockVerify).toHaveBeenCalledWith({ email: 'a@b.com', token: '123456', type: 'signup' }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/register/customer'))
  })

  it('shows a message and stays put when the code is wrong', async () => {
    mockVerify.mockResolvedValue({ data: { session: null, user: null }, error: { message: 'bad' } })
    const user = userEvent.setup()
    render(<VerifyPage />)
    await user.type(screen.getByLabelText(/verification code/i), '000000')
    await user.click(screen.getByRole('button', { name: 'Verify' }))
    expect(await screen.findByText(/wrong or has expired/i)).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('sends a fresh code straight away when arriving from the login page', async () => {
    search = 'email=a%40b.com&resend=1'
    render(<VerifyPage />)
    await waitFor(() => expect(mockResend).toHaveBeenCalledWith({ type: 'signup', email: 'a@b.com' }))
  })

  it('asks for the email when none was given', () => {
    search = ''
    render(<VerifyPage />)
    expect(screen.getByText(/need your email/i)).toBeInTheDocument()
  })
})
