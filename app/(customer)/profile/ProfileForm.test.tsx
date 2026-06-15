import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { ProfileForm } from './ProfileForm'
import type { CustomerProfile } from '@/lib/types/profile'

const baseProfile: CustomerProfile = {
  full_name: 'Maya Cohen',
  phone: '050-1234567',
  bio: 'Looking for a reliable cleaner for my apartment.',
  preferred_service_type: 'residential',
  address: '12 Rothschild Blvd, Tel Aviv',
  avatar_url: null,
}

describe('ProfileForm', () => {
  it('renders fields pre-filled with the given profile', () => {
    render(<ProfileForm defaultValues={baseProfile} />)

    expect(screen.getByLabelText<HTMLInputElement>(/full name/i).value).toBe('Maya Cohen')
    expect(screen.getByLabelText<HTMLInputElement>(/phone/i).value).toBe('050-1234567')
    expect(screen.getByLabelText<HTMLTextAreaElement>(/bio/i).value).toBe('Looking for a reliable cleaner for my apartment.')
    expect(screen.getByLabelText<HTMLSelectElement>(/preferred service type/i).value).toBe('residential')
    expect(screen.getByLabelText<HTMLInputElement>(/address/i).value).toBe('12 Rothschild Blvd, Tel Aviv')
  })

  it('calls onSave with the updated profile when submitted', async () => {
    const user = userEvent.setup()
    const onSave = jest.fn()
    render(<ProfileForm defaultValues={baseProfile} onSave={onSave} />)

    const fullName = screen.getByLabelText<HTMLInputElement>(/full name/i)
    await user.clear(fullName)
    await user.type(fullName, 'Maya Levi')

    await user.selectOptions(screen.getByLabelText(/preferred service type/i), 'both')

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalledWith({
      ...baseProfile,
      full_name: 'Maya Levi',
      preferred_service_type: 'both',
    })
  })

  it('shows a confirmation message after saving', async () => {
    const user = userEvent.setup()
    render(<ProfileForm defaultValues={baseProfile} />)

    expect(screen.queryByText(/profile updated/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(screen.getByText(/profile updated/i)).toBeInTheDocument()
  })

  it('shows the initial when there is no avatar photo', () => {
    render(<ProfileForm defaultValues={baseProfile} />)

    expect(screen.queryByRole('img', { name: /profile photo/i })).not.toBeInTheDocument()
  })

  it('shows the avatar image when avatar_url is set', () => {
    render(<ProfileForm defaultValues={{ ...baseProfile, avatar_url: 'https://example.com/me.jpg' }} />)

    expect(screen.getByRole('img', { name: /profile photo/i })).toHaveAttribute('src', 'https://example.com/me.jpg')
  })

  it('lets the user pick a new photo, previews it, and includes it when saving', async () => {
    const user = userEvent.setup()
    const onSave = jest.fn()
    render(<ProfileForm defaultValues={baseProfile} onSave={onSave} />)

    const file = new File(['avatar-bytes'], 'avatar.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText(/change photo/i), file)

    expect(await screen.findByRole('img', { name: /profile photo/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ avatar_url: expect.stringMatching(/^data:image\/png/) })
    )
  })
})
