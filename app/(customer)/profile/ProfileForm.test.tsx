import { fireEvent, screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { ProfileForm } from './ProfileForm'

// The picked file is normalized to a JPEG (async) before preview — mock the
// converter to pass the file through so the preview path stays deterministic.
jest.mock('@/lib/image/normalizeImage', () => ({
  normalizeImageToJpeg: (f: File) => Promise.resolve(f),
}))

const baseProfile = {
  full_name: 'Maya Cohen',
  phone: '050-1234567',
  bio: 'Looking for a reliable cleaner for my apartment.',
  address: '12 Rothschild Blvd, Tel Aviv',
  avatar_url: null as string | null,
  num_rooms: '',
  pet_types: [] as ('dog' | 'cat')[],
  num_pets: '',
  pet_photo_url: null as string | null,
  num_kids_under_15: '',
  num_people: '',
  house_size_sqm: '',
  dwelling_type: null as 'apartment' | 'house' | 'villa' | 'guesthouse' | 'office' | 'other' | null,
  floor: '',
}

// The form submits via a server action; a no-op stub is enough to render it.
const noopAction = async () => ({ success: true })

// jsdom doesn't implement URL.createObjectURL, which the photo picker uses.
beforeAll(() => {
  URL.createObjectURL = jest.fn(() => 'blob:preview')
})

describe('ProfileForm', () => {
  it('renders fields pre-filled with the given profile', () => {
    render(<ProfileForm defaultValues={baseProfile} action={noopAction} />)

    expect(screen.getByLabelText<HTMLInputElement>(/full name/i).value).toBe('Maya Cohen')
    expect(screen.getByLabelText<HTMLInputElement>(/phone/i).value).toBe('050-1234567')
    expect(screen.getByLabelText<HTMLTextAreaElement>('Your introduction').value).toBe('Looking for a reliable cleaner for my apartment.')
    expect(screen.getByLabelText<HTMLInputElement>(/street and number/i).value).toBe('12 Rothschild Blvd, Tel Aviv')
  })

  it('shows the name initial when there is no avatar photo', () => {
    render(<ProfileForm defaultValues={baseProfile} action={noopAction} />)

    expect(screen.queryByRole('img', { name: /profile/i })).not.toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('shows the avatar image when avatar_url is set', () => {
    render(<ProfileForm defaultValues={{ ...baseProfile, avatar_url: 'https://example.com/me.jpg' }} action={noopAction} />)

    expect(screen.getByRole('img', { name: /profile/i })).toHaveAttribute('src', 'https://example.com/me.jpg')
  })

  it('previews a newly picked photo', async () => {
    render(<ProfileForm defaultValues={baseProfile} action={noopAction} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['avatar-bytes'], 'avatar.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // Preview is set after the async normalize step resolves.
    expect(await screen.findByRole('img', { name: /profile/i })).toHaveAttribute('src', 'blob:preview')
  })

  it('keeps a villa, office or guesthouse home type instead of blanking it on save', () => {
    render(<ProfileForm defaultValues={{ ...baseProfile, dwelling_type: 'villa' }} action={noopAction} />)
    const select = screen.getByLabelText<HTMLSelectElement>(/property type/i)
    expect(select.value).toBe('villa')
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['', 'apartment', 'house', 'villa', 'guesthouse', 'office'])
  })

  it('lets the host say how many floors the home has', () => {
    render(<ProfileForm defaultValues={{ ...baseProfile, num_floors: '2' }} action={noopAction} />)
    const floors = screen.getByLabelText<HTMLInputElement>(/floors in the home/i)
    expect(floors.name).toBe('num_floors')
    expect(floors.value).toBe('2')
  })

  it('writes the About us paragraph from the answers, and keeps edits unless confirmed', () => {
    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ProfileForm defaultValues={{ ...baseProfile, bio: '', dwelling_type: 'house', num_floors: '2' }} action={noopAction} />)
    fireEvent.click(screen.getByRole('button', { name: 'Weekly' }))
    fireEvent.click(screen.getByRole('button', { name: 'Write it for me' }))
    const box = screen.getByLabelText<HTMLTextAreaElement>('Your introduction')
    expect(box.name).toBe('bio')
    expect(box.value).toContain('We live in a two-story house.')
    expect(box.value).toContain("We'd love help once a week.")
    // The host edits it; writing again asks before replacing their words.
    fireEvent.change(box, { target: { value: 'My own words' } })
    fireEvent.click(screen.getByRole('button', { name: 'Write it again' }))
    expect(confirm).toHaveBeenCalled()
    expect(box.value).toBe('My own words')
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Write it again' }))
    expect(box.value).toContain("We'd love help once a week.")
    confirm.mockRestore()
  })

  it('sends the household and needs answers with the form', () => {
    const { container } = render(<ProfileForm defaultValues={baseProfile} action={noopAction} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tue' }))
    const hidden = container.querySelector<HTMLInputElement>('input[name="host_extras"]')!
    expect(JSON.parse(hidden.value)).toMatchObject({ preferredDays: ['tue'] })
  })
})
