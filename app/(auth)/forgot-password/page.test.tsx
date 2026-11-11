import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import ForgotPasswordPage from './page'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }) }))

const mockReset = jest.fn()
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { resetPasswordForEmail: (...a: unknown[]) => mockReset(...a) } }),
}))

beforeEach(() => { jest.clearAllMocks(); mockReset.mockResolvedValue({ error: null }) })

describe('ForgotPasswordPage', () => {
  it('asks for a code and moves to the reset screen', async () => {
    render(<ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText(/email/i), ' a@b.com ')
    await userEvent.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/reset-password?email=a%40b.com'))
    expect(mockReset).toHaveBeenCalledWith('a@b.com')
  })

  it('does not reveal whether the address has an account (a user-not-found style error still moves on)', async () => {
    mockReset.mockResolvedValue({ error: { status: 400, message: 'User not found' } })
    render(<ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText(/email/i), 'nobody@b.com')
    await userEvent.click(screen.getByRole('button', { name: /send code/i }))
    await waitFor(() => expect(mockPush).toHaveBeenCalled())
  })

  it('shows a wait message when rate limited, and stays here', async () => {
    mockReset.mockResolvedValue({ error: { status: 429, message: 'email rate limit exceeded' } })
    render(<ForgotPasswordPage />)
    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.com')
    await userEvent.click(screen.getByRole('button', { name: /send code/i }))
    expect(await screen.findByText(/wait a minute/i)).toBeInTheDocument()
    expect(mockPush).not.toHaveBeenCalled()
  })
})
