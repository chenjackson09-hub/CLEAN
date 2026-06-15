import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { CustomerListCard } from './CustomerListCard'
import type { CustomerResult } from '@/lib/types/customer'

const customer: CustomerResult & { adminNotes: string } = {
  id: '1',
  full_name: 'Maya Cohen',
  email: 'maya.cohen@example.com',
  phone: '050-111-1111',
  address: '12 Rothschild Blvd, Tel Aviv',
  adminNotes: '',
}

describe('CustomerListCard', () => {
  it('renders customer info', () => {
    render(<CustomerListCard customer={customer} onSaveNotes={jest.fn()} onDelete={jest.fn()} />)

    expect(screen.getByText('Maya Cohen')).toBeInTheDocument()
    expect(screen.getByText('maya.cohen@example.com')).toBeInTheDocument()
    expect(screen.getByText('050-111-1111')).toBeInTheDocument()
    expect(screen.getByText('12 Rothschild Blvd, Tel Aviv')).toBeInTheDocument()
  })

  it('saves edited notes', async () => {
    const user = userEvent.setup()
    const onSaveNotes = jest.fn()
    render(<CustomerListCard customer={customer} onSaveNotes={onSaveNotes} onDelete={jest.fn()} />)

    const textarea = screen.getByPlaceholderText('Write a note about this person...')
    await user.type(textarea, 'Prefers mornings')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveNotes).toHaveBeenCalledWith('1', 'Prefers mornings')
    expect(screen.getByText('✅ Saved')).toBeInTheDocument()
  })

  it('deletes after confirmation', async () => {
    const user = userEvent.setup()
    const onDelete = jest.fn()
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<CustomerListCard customer={customer} onSaveNotes={jest.fn()} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith('1')
  })

  it('does not delete if confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const onDelete = jest.fn()
    jest.spyOn(window, 'confirm').mockReturnValue(false)
    render(<CustomerListCard customer={customer} onSaveNotes={jest.fn()} onDelete={onDelete} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).not.toHaveBeenCalled()
  })
})
