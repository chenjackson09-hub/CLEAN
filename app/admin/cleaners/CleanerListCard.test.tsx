import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { CleanerListCard } from './CleanerListCard'
import type { CleanerResult } from '@/lib/types/cleaner'

const cleaner: CleanerResult & { adminNotes: string } = {
  id: '1',
  full_name: 'Sarah M.',
  avatar_url: null,
  bio: 'Reliable and thorough.',
  service_types: ['residential'],
  hourly_rate: 80,
  years_experience: 5,
  languages: ['EN', 'HE'],
  distance_km: 2.1,
  area: 'Tel Aviv',
  email: 'sarah.m@example.com',
  phone: '050-222-1111',
  adminNotes: '',
}

describe('CleanerListCard', () => {
  it('renders cleaner info', () => {
    render(<CleanerListCard cleaner={cleaner} onSaveNotes={jest.fn()} onDelete={jest.fn()} />)

    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
    expect(screen.getByText('sarah.m@example.com')).toBeInTheDocument()
    expect(screen.getByText('050-222-1111')).toBeInTheDocument()
    expect(screen.getByText('Tel Aviv')).toBeInTheDocument()
    expect(screen.getByText('Residential')).toBeInTheDocument()
  })

  it('saves edited notes', async () => {
    const user = userEvent.setup()
    const onSaveNotes = jest.fn()
    render(<CleanerListCard cleaner={cleaner} onSaveNotes={onSaveNotes} onDelete={jest.fn()} />)

    const textarea = screen.getByPlaceholderText('Write a note about this person...')
    await user.type(textarea, 'Great with pets')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveNotes).toHaveBeenCalledWith('1', 'Great with pets')
    expect(screen.getByText('✅ Saved')).toBeInTheDocument()
  })

  it('deletes after confirmation', async () => {
    const user = userEvent.setup()
    const onDelete = jest.fn()
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<CleanerListCard cleaner={cleaner} onSaveNotes={jest.fn()} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('does not delete if confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const onDelete = jest.fn()
    jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<CleanerListCard cleaner={cleaner} onSaveNotes={jest.fn()} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).not.toHaveBeenCalled()
  })
})
