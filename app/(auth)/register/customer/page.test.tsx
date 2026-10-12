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
const mockGetPublicUrl = jest.fn()
const mockFrom = jest.fn()
const mockStorageFrom = jest.fn()

const LOCALITY = {
  id: 'loc-1', cbs_code: 322, name_he: 'בית הלל', name_en: 'Bet Hillel', locality_type: 'moshav',
  regional_council: 'מבואות החרמון', lat: 33.2085, lng: 35.6058,
}

beforeEach(() => {
  jest.clearAllMocks()
  // The area picker's autocomplete endpoint.
  global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ results: [LOCALITY] }) }) as unknown as typeof fetch
  localStorage.clear()
  mockFrom.mockImplementation(() => ({
    upsert: mockUpsert,
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
  }))
  mockUpsert.mockResolvedValue({ error: null })
  mockStorageFrom.mockImplementation(() => ({ upload: jest.fn(), getPublicUrl: mockGetPublicUrl }))
  mockedCreateClient.mockReturnValue({
    auth: { signUp: mockSignUp },
    from: mockFrom,
    storage: { from: mockStorageFrom },
  } as unknown as ReturnType<typeof createClient>)
})

async function fillRequiredStepsAndReachPreview(user: ReturnType<typeof userEvent.setup>) {
  // Step 1 — About you: only first/last name are required.
  await user.type(screen.getByLabelText(/first name/i), 'Jane')
  await user.type(screen.getByLabelText(/last name/i), 'Doe')
  await user.click(screen.getByRole('button', { name: /next/i }))

  // Step 2 — Your home: only the area is required — picked from the official list.
  await user.type(screen.getByLabelText(/area \/ town/i), 'Beit Hil')
  await user.click(await screen.findByRole('option', { name: /Bet Hillel/ }))
  await user.click(screen.getByRole('button', { name: /next/i }))

  // Step 3 — Household: fully optional, just advance.
  await user.click(screen.getByRole('button', { name: /next/i }))

  // Step 4 — Preferences: fully optional, just advance to the preview.
  await user.click(screen.getByRole('button', { name: /next/i }))
}

describe('CustomerOnboardingPage', () => {
  it('redirects to /register if no pending signup is found', () => {
    render(<CustomerOnboardingPage />)

    expect(mockReplace).toHaveBeenCalledWith('/register')
  })

  it('renders the first step (About you) when a pending signup exists', () => {
    localStorage.setItem('pending_signup', JSON.stringify({ email: 'a@b.com', password: 'pass123' }))

    render(<CustomerOnboardingPage />)

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    // Next is disabled until both required fields are filled.
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('walks through the wizard and submits, creating the account and saving profile + customer rows', async () => {
    localStorage.setItem('pending_signup', JSON.stringify({ email: 'a@b.com', password: 'pass123' }))
    mockSignUp.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockedGeocode.mockResolvedValue({ lat: 32.08, lng: 34.78 })

    const user = userEvent.setup()
    render(<CustomerOnboardingPage />)

    await fillRequiredStepsAndReachPreview(user)

    // Final screen — the Next button becomes the submit CTA.
    await user.click(screen.getByRole('button', { name: /start finding cleaners/i }))

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'pass123',
        options: { data: { role: 'customer' } },
      })
    })

    // A picked locality supplies the official coordinates — no free-text geocoding.
    expect(mockedGeocode).not.toHaveBeenCalled()

    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        role: 'customer',
        full_name: 'Jane Doe',
      }),
    )

    expect(mockFrom).toHaveBeenCalledWith('customers')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        first_name: 'Jane',
        last_name: 'Doe',
        address: 'בית הלל',
        lat: 33.2085,
        lng: 35.6058,
      }),
    )

    await waitFor(() => {
      expect(localStorage.getItem('pending_signup')).toBeNull()
    })
    expect(mockPush).toHaveBeenCalledWith('/browse')
  })
})
