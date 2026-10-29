import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import CustomerOnboardingPage from './page'
import { EMPTY_CUSTOMER_DRAFT } from '@/lib/onboarding/customer'

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockRouter = { push: mockPush, replace: mockReplace }
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }))

// Photos go straight to storage from the browser; everything else goes through the server.
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) }, storage: { from: () => ({ upload: jest.fn(), getPublicUrl: () => ({ data: { publicUrl: 'x' } }) }) } }) }))

const mockLoad = jest.fn()
const mockSave = jest.fn()
const mockSignOut = jest.fn()
jest.mock('../../onboardingActions', () => ({ loadOnboarding: (...a: unknown[]) => mockLoad(...a), saveOnboarding: (...a: unknown[]) => mockSave(...a) }))
jest.mock('../../actions', () => ({ signOutToLogin: (...a: unknown[]) => mockSignOut(...a) }))

const LOCALITY = {
  id: 'loc-1', cbs_code: 322, name_he: 'בית הלל', name_en: 'Bet Hillel', locality_type: 'moshav',
  regional_council: 'מבואות החרמון', lat: 33.2085, lng: 35.6058,
}
const fresh = () => ({ role: 'customer', step: 0, completed: false, draft: EMPTY_CUSTOMER_DRAFT, locality: null })

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ results: [LOCALITY] }) }) as unknown as typeof fetch
  localStorage.clear()
  mockLoad.mockResolvedValue(fresh())
  mockSave.mockResolvedValue({ ok: true })
})

describe('Host wizard (account already exists, answers saved step by step)', () => {
  it('goes back to /register when nobody is signed in', async () => {
    mockLoad.mockResolvedValue({ error: 'Not signed in' })
    render(<CustomerOnboardingPage />)
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/register'))
  })

  it('sends an already-submitted sign-up to the schedule instead of showing the questions again', async () => {
    mockLoad.mockResolvedValue({ ...fresh(), completed: true })
    render(<CustomerOnboardingPage />)
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/browse'))
  })

  it('sends a cleaner who lands on the host wizard to the cleaner wizard', async () => {
    mockLoad.mockResolvedValue({ ...fresh(), role: 'cleaner' })
    render(<CustomerOnboardingPage />)
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/register/cleaner'))
  })

  it('shows About you first as step 1 of 5, with Continue disabled until both names are filled', async () => {
    render(<CustomerOnboardingPage />)
    expect(await screen.findByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('resumes where the person stopped, with their saved answers filled in', async () => {
    mockLoad.mockResolvedValue({
      ...fresh(), step: 1,
      draft: { ...EMPTY_CUSTOMER_DRAFT, firstName: 'Jane', lastName: 'Doe', localityId: LOCALITY.id },
      locality: LOCALITY,
    })
    render(<CustomerOnboardingPage />)
    // Step 2 (Where is your home?), with the town already chosen.
    expect(await screen.findByText(/bet hillel|בית הלל/i)).toBeInTheDocument()
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument()
    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  })

  it('never claims the street is hidden: it says the street is shared with a cleaner on request', async () => {
    mockLoad.mockResolvedValue({ ...fresh(), step: 1 })
    render(<CustomerOnboardingPage />)
    expect(await screen.findByText(/street address is shared with a cleaner when you send them a request/i)).toBeInTheDocument()
  })

  it('saves each screen when Continue is pressed, then the final screen as a submit', async () => {
    const user = userEvent.setup()
    render(<CustomerOnboardingPage />)
    await user.type(await screen.findByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1))
    expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'customer', step: 1, submit: false, draft: expect.objectContaining({ firstName: 'Jane', lastName: 'Doe' }) }))

    await user.type(await screen.findByLabelText(/^town/i), 'Beit Hil')
    await user.click(await screen.findByRole('option', { name: /Bet Hillel/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(2))
    // The server is told the official town by id — never coordinates or text it must trust.
    expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ step: 2, draft: expect.objectContaining({ localityId: 'loc-1', area: '' }) }))

    // Home: pick a type and add a bedroom; then pets (skipped); then the preview.
    await user.click(await screen.findByRole('button', { name: 'Villa' }))
    await user.click(screen.getByRole('button', { name: 'Bedrooms +' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(3))
    expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ draft: expect.objectContaining({ homeType: 'villa', bedrooms: '1' }) }))
    await user.click(await screen.findByRole('button', { name: 'Skip for now' }))
    expect(await screen.findByText('Your profile')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start finding cleaners' }))
    await waitFor(() => expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ submit: true })))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/browse'))
  })

  it('no longer asks for priorities, frequency or home instructions', async () => {
    const user = userEvent.setup()
    mockLoad.mockResolvedValue({ ...fresh(), step: 2 })
    render(<CustomerOnboardingPage />)
    await screen.findByText('Your home')
    expect(screen.queryByText(/important to you/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(await screen.findByRole('button', { name: 'Continue' }))
    expect(screen.queryByText(/how often/i)).not.toBeInTheDocument()
  })

  it('the preview offers Edit on each section and returns to the preview after it', async () => {
    const user = userEvent.setup()
    mockLoad.mockResolvedValue({
      ...fresh(), step: 4,
      draft: { ...EMPTY_CUSTOMER_DRAFT, firstName: 'Jane', lastName: 'Doe', localityId: LOCALITY.id },
      locality: LOCALITY,
    })
    render(<CustomerOnboardingPage />)
    await screen.findByText('Your profile')
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[0]) // About you
    expect(await screen.findByLabelText(/first name/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Back to preview' }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    expect(await screen.findByText('Your profile')).toBeInTheDocument()
  })

  it('stays on the screen and shows the problem when saving fails', async () => {
    mockSave.mockResolvedValue({ error: 'Could not save. Please try again.' })
    const user = userEvent.setup()
    render(<CustomerOnboardingPage />)
    await user.type(await screen.findByLabelText(/first name/i), 'Jane')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Could not save. Please try again.')).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
  })

  it('never keeps a password in the browser', async () => {
    render(<CustomerOnboardingPage />)
    await screen.findByLabelText(/first name/i)
    expect(localStorage.getItem('pending_signup')).toBeNull()
  })
})
