import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { ApplicationsList } from './ApplicationsList'
import { updateApplicationStatus } from '@/app/admin/actions'

jest.mock('@/app/admin/actions', () => ({
  updateApplicationStatus: jest.fn().mockResolvedValue({}),
  updateApplicationNotes: jest.fn().mockResolvedValue({}),
}))

const apps = [
  {
    id: '1',
    cleaner_id: 'c1',
    full_name: 'Pending Cleaner',
    email: 'a@b.com',
    phone: '050',
    bio: 'bio',
    service_types: ['residential'] as const,
    hourly_rate: 75,
    years_experience: 2,
    languages: [],
    address: 'addr',
    status: 'pending' as const,
    submitted_at: '2026-06-10',
    id_document_url: null,
    admin_notes: null,
  },
]

describe('ApplicationsList', () => {
  it('moves a card out of the current tab once its status changes, without a page reload', async () => {
    const user = userEvent.setup()
    render(<ApplicationsList applications={apps} />)

    await user.click(screen.getByRole('button', { name: /Pending review/ }))
    expect(screen.getByText('Pending Cleaner')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(updateApplicationStatus).toHaveBeenCalledWith('1', 'c1', 'approved', '')
    // Still on the "Pending review" tab — the approved card should no longer match it.
    expect(screen.queryByText('Pending Cleaner')).not.toBeInTheDocument()
  })

  it('updates the tab counts after a status change', async () => {
    const user = userEvent.setup()
    render(<ApplicationsList applications={apps} />)

    expect(screen.getByRole('button', { name: /Approved \(0\)/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(screen.getByRole('button', { name: /Approved \(1\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Pending review \(0\)/ })).toBeInTheDocument()
  })
})
