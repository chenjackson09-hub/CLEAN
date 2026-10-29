import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import CleanerOnboardingPage from './page'
import { EMPTY_CLEANER_DRAFT } from '@/lib/onboarding/cleaner'

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockRouter = { push: mockPush, replace: mockReplace } // stable, like Next's real router
jest.mock('next/navigation', () => ({ useRouter: () => mockRouter }))
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
const fresh = (over = {}) => ({ role: 'cleaner', step: 0, completed: false, draft: EMPTY_CLEANER_DRAFT, locality: null, ...over })
const FILLED = { ...EMPTY_CLEANER_DRAFT, name: 'Noa Rosen', birthD: '5', birthM: '3', birthY: '1995', localityId: LOCALITY.id, services: ['Deep cleaning'] }

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockResolvedValue({ json: async () => ({ results: [LOCALITY] }) }) as unknown as typeof fetch
  mockLoad.mockResolvedValue(fresh())
  mockSave.mockResolvedValue({ ok: true })
})

const lastDraft = () => mockSave.mock.calls[mockSave.mock.calls.length - 1][0].draft

describe('Cleaner wizard (9 screens, every Continue saved)', () => {
  it('redirects when nobody is signed in, when already submitted, or when it is a host', async () => {
    mockLoad.mockResolvedValueOnce({ error: 'Not signed in' })
    const { unmount } = render(<CleanerOnboardingPage />)
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/register'))
    unmount()
    mockLoad.mockResolvedValueOnce(fresh({ completed: true }))
    const second = render(<CleanerOnboardingPage />)
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/cleaner/dashboard'))
    second.unmount()
    mockLoad.mockResolvedValueOnce(fresh({ role: 'customer' }))
    render(<CleanerOnboardingPage />)
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/register/customer'))
  })

  it('starts with step 1 of 9 and needs a name and a real birth date before Continue', async () => {
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    expect(await screen.findByLabelText('Full name')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 9')).toBeInTheDocument()
    expect(screen.getByText(/only your age is shown/i)).toBeInTheDocument()
    const next = screen.getByRole('button', { name: 'Continue' })
    expect(next).toBeDisabled()
    await user.type(screen.getByLabelText('Full name'), 'Noa Rosen')
    expect(next).toBeDisabled() // still no birth date
    await user.selectOptions(screen.getByLabelText('Day'), '5')
    await user.selectOptions(screen.getByLabelText('Month'), '3')
    await user.selectOptions(screen.getByLabelText('Year'), '1995')
    expect(next).toBeEnabled()
  })

  it('shows the field error next to the field and blocks someone under 14', async () => {
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    const name = await screen.findByLabelText('Full name')
    await user.click(name)
    await user.tab()
    expect(screen.getByText('Please enter your name.')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Day'), '1')
    await user.selectOptions(screen.getByLabelText('Month'), '1')
    await user.selectOptions(screen.getByLabelText('Year'), String(new Date().getFullYear() - 5))
    expect(screen.getByText('You need to be at least 14 to sign up.')).toBeInTheDocument()
  })

  it('resumes where the person stopped', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 3, draft: FILLED, locality: LOCALITY }))
    render(<CleanerOnboardingPage />)
    expect(await screen.findByText('What do you clean?')).toBeInTheDocument()
    expect(screen.getByText('Step 4 of 9')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deep cleaning' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('offers the grouped service list and needs one choice', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 3, draft: { ...FILLED, services: [] }, locality: LOCALITY }))
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    await screen.findByText('What do you clean?')
    for (const name of ['Homes', 'Other places', 'Also', 'Regular cleaning', 'Move-in / move-out', 'Airbnb & guesthouses', 'Pet-friendly', 'Organizing']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    expect(screen.queryByText('Closets')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Windows' }))
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  })

  it('saves each screen on Continue and sends only plain answers', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 0, draft: FILLED, locality: LOCALITY }))
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    await screen.findByLabelText('Full name')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1))
    expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'cleaner', step: 1, submit: false }))
    expect(lastDraft()).toMatchObject({ name: 'Noa Rosen', birthY: '1995', localityId: 'loc-1' })
  })

  it('optional screens have a Skip link, required ones do not', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 2, draft: FILLED, locality: LOCALITY }))
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    await screen.findByText('Getting there')
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeInTheDocument()
    expect(screen.getByText(/Hosts within 10 km of Bet Hillel can find you/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Skip for now' }))
    await screen.findByText('What do you clean?')
    expect(screen.queryByRole('button', { name: 'Skip for now' })).not.toBeInTheDocument()
  })

  it('asks about the car, and the fuel questions only after "yes"', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 2, draft: FILLED, locality: LOCALITY }))
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    await screen.findByText('Getting there')
    expect(screen.queryByText('Do you ask hosts to cover fuel?')).not.toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Yes' })[0])
    expect(screen.getByText('Do you ask hosts to cover fuel?')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Yes' })[1])
    expect(screen.getByLabelText('Amount per km')).toBeInTheDocument()
  })

  it('rate and hours: stepper changes the job length', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 4, draft: FILLED, locality: LOCALITY }))
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    await screen.findByText('Your rate and hours')
    await user.click(screen.getByRole('button', { name: "Shortest job you'll take +" }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    expect(lastDraft().duration).toBe('3.5')
  })

  it('experience is five cards, languages are chips plus an "other" field', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 5, draft: FILLED, locality: LOCALITY }))
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    await screen.findByText('Your experience')
    for (const n of ['New to cleaning', 'Under 1 year', '1–3 years', '3–5 years', '5+ years']) expect(screen.getByRole('button', { name: n })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '3–5 years' }))
    await user.click(screen.getByRole('button', { name: 'Hebrew' }))
    await user.click(screen.getByRole('button', { name: 'Russian' }))
    await user.type(screen.getByLabelText('Other'), 'Tigrinya')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    expect(lastDraft()).toMatchObject({ experience: '3_5', languages: ['Hebrew', 'Russian'], languagesOther: 'Tigrinya' })
  })

  it('"Either is fine" is preselected and choosing another card is saved', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 6, draft: FILLED, locality: LOCALITY }))
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    await screen.findByText('What kind of work do you prefer?')
    // The card names both options it stands for, so nobody has to guess what "either" means.
    expect(screen.getByRole('button', { name: /Either is fine/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Either is fine/ })).toHaveTextContent('A regular family I keep coming back to · Jobs once in a while')
    await user.click(screen.getByRole('button', { name: 'Jobs once in a while' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    expect(lastDraft().matchTypes).toEqual(['occasional'])
  })

  it('the preview writes out BOTH options when "either is fine" is chosen', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 8, draft: FILLED, locality: LOCALITY }))
    render(<CleanerOnboardingPage />)
    await screen.findByText('Your profile')
    expect(screen.getByText('A regular family I keep coming back to')).toBeInTheDocument()
    expect(screen.getByText('Jobs once in a while')).toBeInTheDocument()
    expect(screen.queryByText('Either is fine')).not.toBeInTheDocument()
  })

  it('guided About me builds the text from the prompts and stays editable', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 7, draft: FILLED, locality: LOCALITY }))
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    await screen.findByText('Tell hosts about yourself')
    await user.click(screen.getAllByRole('button', { name: 'I take pride in…' })[0])
    const first = screen.getByLabelText('How long have you been cleaning, and what are you known for?')
    await user.type(first, 'every corner.')
    expect(screen.getByLabelText('Your text (you can edit it)')).toHaveValue('I take pride in every corner.')
    await user.type(screen.getByLabelText('Your text (you can edit it)'), ' Extra.')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    expect(lastDraft().bio).toBe('I take pride in every corner. Extra.')
  })

  it('the preview shows the answers; Edit jumps to that screen and "Back to preview" returns', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 8, draft: { ...FILLED, bio: 'Hello there', experience: '1_3' }, locality: LOCALITY }))
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    expect(await screen.findByText('Hello there')).toBeInTheDocument()
    expect(screen.getByText('Noa Rosen, 31')).toBeInTheDocument()
    expect(screen.getByText('Deep cleaning')).toBeInTheDocument()
    expect(screen.getByText('1–3 years')).toBeInTheDocument()
    expect(screen.getByText("You'll be able to set your available days next.")).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Edit' })[3]) // services
    await screen.findByText('What do you clean?')
    await user.click(screen.getByRole('button', { name: 'Windows' }))
    await user.click(screen.getByRole('button', { name: 'Back to preview' }))
    await waitFor(() => expect(mockSave).toHaveBeenCalled())
    expect(await screen.findByText('Hello there')).toBeInTheDocument()
    expect(screen.getByText('Windows')).toBeInTheDocument()
  })

  it('submits from the preview, then offers to set available days', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 8, draft: FILLED, locality: LOCALITY }))
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    await screen.findByText('Your profile')
    await user.click(screen.getByRole('button', { name: 'Submit for review' }))
    await waitFor(() => expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ submit: true })))
    await user.click(await screen.findByRole('button', { name: 'Set my available days' }))
    expect(mockPush).toHaveBeenCalledWith('/cleaner/availability?welcome=1')
  })

  it('stays on the screen and shows the problem when saving fails', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 0, draft: FILLED, locality: LOCALITY }))
    mockSave.mockResolvedValue({ error: 'Could not save. Please try again.' })
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    await screen.findByLabelText('Full name')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    expect(await screen.findByText('Could not save. Please try again.')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 9')).toBeInTheDocument()
  })

  it('"continue later" saves and signs out', async () => {
    mockLoad.mockResolvedValue(fresh({ step: 2, draft: FILLED, locality: LOCALITY }))
    const user = userEvent.setup()
    render(<CleanerOnboardingPage />)
    await screen.findByText('Getting there')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByRole('button', { name: 'Yes, continue later' }))
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled())
    expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ submit: false }))
  })
})
