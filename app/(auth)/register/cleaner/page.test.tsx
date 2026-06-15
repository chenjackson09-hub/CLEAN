import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import CleanerOnboardingPage from './page'
import { createClient } from '@/lib/supabase/client'
import { addApplication } from '@/lib/mockApplicationsStore'

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockRouter = { push: mockPush, replace: mockReplace }
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/mockApplicationsStore', () => ({
  addApplication: jest.fn(),
}))

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockedAddApplication = addApplication as jest.MockedFunction<typeof addApplication>

const mockSignUp = jest.fn()
const mockUpsert = jest.fn()
const mockFrom = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  mockFrom.mockImplementation(() => ({ upsert: mockUpsert }))
  mockUpsert.mockResolvedValue({ error: null })
  mockedCreateClient.mockReturnValue({
    auth: { signUp: mockSignUp },
    from: mockFrom,
  } as unknown as ReturnType<typeof createClient>)
})

describe('CleanerOnboardingPage', () => {
  it('redirects to /register if no pending signup is found', () => {
    render(<CleanerOnboardingPage />)

    expect(mockReplace).toHaveBeenCalledWith('/register')
  })

  it('renders the application form when a pending signup exists', () => {
    localStorage.setItem(
      'pending_signup',
      JSON.stringify({ email: 'a@b.com', password: 'pass123' })
    )

    render(<CleanerOnboardingPage />)

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/service type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/hourly rate/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/years of experience/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'EN' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'HE' })).toBeInTheDocument()
  })

  it('creates the account, saves the profile, and submits the application', async () => {
    localStorage.setItem(
      'pending_signup',
      JSON.stringify({ email: 'cleaner@example.com', password: 'pass123' })
    )
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })

    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)

    await user.type(screen.getByLabelText(/full name/i), 'Jane Cleaner')
    await user.type(screen.getByLabelText(/phone/i), '050-123-4567')
    await user.type(screen.getByLabelText(/bio/i), 'I love cleaning.')
    await user.selectOptions(screen.getByLabelText(/service type/i), 'residential')
    await user.type(screen.getByLabelText(/hourly rate/i), '80')
    await user.type(screen.getByLabelText(/years of experience/i), '3')
    await user.click(screen.getByRole('checkbox', { name: 'EN' }))
    await user.click(screen.getByRole('checkbox', { name: 'HE' }))
    await user.type(screen.getByLabelText(/address/i), '1 Rothschild Blvd, Tel Aviv')
    await user.click(screen.getByRole('button', { name: /submit application/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({ email: 'cleaner@example.com', password: 'pass123' })
    })

    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        role: 'cleaner',
        full_name: 'Jane Cleaner',
      })
    )

    expect(mockedAddApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'Jane Cleaner',
        email: 'cleaner@example.com',
        phone: '050-123-4567',
        bio: 'I love cleaning.',
        service_types: ['residential'],
        hourly_rate: 80,
        years_experience: 3,
        languages: ['EN', 'HE'],
        address: '1 Rothschild Blvd, Tel Aviv',
        status: 'pending',
      })
    )

    await waitFor(() => {
      expect(localStorage.getItem('pending_signup')).toBeNull()
    })

    expect(screen.getByText(/application submitted/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login')
  })
})
