import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import CustomerOnboardingPage from './page'
import { createClient } from '@/lib/supabase/client'
import { geocodeAddress } from '@/lib/geocode'

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockRouter = { push: mockPush, replace: mockReplace }
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/geocode', () => ({
  geocodeAddress: jest.fn(),
}))

const mockedCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockedGeocode = geocodeAddress as jest.MockedFunction<typeof geocodeAddress>

const mockSignUp = jest.fn()
const mockUpsert = jest.fn()
const mockInsert = jest.fn()
const mockFrom = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  localStorage.clear()
  mockFrom.mockImplementation(() => ({ upsert: mockUpsert, insert: mockInsert }))
  mockUpsert.mockResolvedValue({ error: null })
  mockInsert.mockResolvedValue({ error: null })
  mockedCreateClient.mockReturnValue({
    auth: { signUp: mockSignUp },
    from: mockFrom,
  } as unknown as ReturnType<typeof createClient>)
})

describe('CustomerOnboardingPage', () => {
  it('redirects to /register if no pending signup is found', () => {
    render(<CustomerOnboardingPage />)

    expect(mockReplace).toHaveBeenCalledWith('/register')
  })

  it('renders the profile form when a pending signup exists', () => {
    localStorage.setItem(
      'pending_signup',
      JSON.stringify({ email: 'a@b.com', password: 'pass123' })
    )

    render(<CustomerOnboardingPage />)

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/preferred service type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
  })

  it('creates the account, geocodes the address, and saves the profile + customer rows', async () => {
    localStorage.setItem(
      'pending_signup',
      JSON.stringify({ email: 'a@b.com', password: 'pass123' })
    )
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockedGeocode.mockResolvedValue({ lat: 32.08, lng: 34.78 })

    const user = userEvent.setup()
    render(<CustomerOnboardingPage />)

    await user.type(screen.getByLabelText(/full name/i), 'Jane Doe')
    await user.selectOptions(screen.getByLabelText(/preferred service type/i), 'residential')
    await user.type(screen.getByLabelText(/address/i), '1 Rothschild Blvd, Tel Aviv')
    await user.click(screen.getByRole('button', { name: /finish/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass123' })
    })

    expect(mockedGeocode).toHaveBeenCalledWith('1 Rothschild Blvd, Tel Aviv')

    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        role: 'customer',
        full_name: 'Jane Doe',
      })
    )

    expect(mockFrom).toHaveBeenCalledWith('customers')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        address: '1 Rothschild Blvd, Tel Aviv',
        lat: 32.08,
        lng: 34.78,
        preferred_service_type: 'residential',
      })
    )

    await waitFor(() => {
      expect(localStorage.getItem('pending_signup')).toBeNull()
    })
    expect(mockPush).toHaveBeenCalledWith('/browse')
  })
})
