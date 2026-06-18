import { fireEvent, screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { ProfileForm } from './ProfileForm'

const baseProfile = {
  full_name: 'Maya Cohen',
  phone: '050-1234567',
  bio: 'Looking for a reliable cleaner for my apartment.',
  preferred_service_type: 'residential' as const,
  address: '12 Rothschild Blvd, Tel Aviv',
  avatar_url: null as string | null,
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
    expect(screen.getByLabelText<HTMLTextAreaElement>(/about me/i).value).toBe('Looking for a reliable cleaner for my apartment.')
    expect(screen.getByLabelText<HTMLSelectElement>(/preferred service type/i).value).toBe('residential')
    expect(screen.getByLabelText<HTMLInputElement>(/address/i).value).toBe('12 Rothschild Blvd, Tel Aviv')
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

  it('previews a newly picked photo', () => {
    render(<ProfileForm defaultValues={baseProfile} action={noopAction} />)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['avatar-bytes'], 'avatar.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(screen.getByRole('img', { name: /profile/i })).toHaveAttribute('src', 'blob:preview')
  })
})
