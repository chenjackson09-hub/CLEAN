import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import RegisterPage from './page'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }) }))

const mockSignUp = jest.fn()
const mockRpc = jest.fn()
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { signUp: (...a: unknown[]) => mockSignUp(...a), signInWithOAuth: jest.fn() }, rpc: (...a: unknown[]) => mockRpc(...a) }) }))

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  mockRpc.mockResolvedValue({ data: false, error: null })
  mockSignUp.mockResolvedValue({ data: { session: { access_token: 't' }, user: { id: 'u1' } }, error: null })
})

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^email/i), 'a@b.com')
  await user.type(screen.getByLabelText(/^password/i), 'secret123')
  await user.type(screen.getByLabelText(/confirm password/i), 'secret123')
}

describe('Register (account is created on the first screen)', () => {
  it('creates the account with the chosen role and goes straight into that wizard', async () => {
    const user = userEvent.setup()
    render(<RegisterPage />)
    await fill(user)
    await user.click(screen.getByText('Cleaner'))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mockSignUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret123', options: { data: { role: 'cleaner' } } }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/register/cleaner'))
    // The password is never parked in the browser any more.
    expect(localStorage.getItem('pending_signup')).toBeNull()
  })

  it('stays on the page with a message when the account cannot be created', async () => {
    mockSignUp.mockResolvedValue({ data: { session: null, user: null }, error: { message: 'boom' } })
    const user = userEvent.setup()
    render(<RegisterPage />)
    await fill(user)
    await user.click(screen.getByText('Cleaner'))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mockSignUp).toHaveBeenCalled())
    expect(mockPush).not.toHaveBeenCalled()
  })
})
