import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { ApplicationsList } from './ApplicationsList'

jest.mock('@/app/admin/actions', () => ({
  updateApplicationStatus: jest.fn().mockResolvedValue({}),
  updateApplicationNotes: jest.fn().mockResolvedValue({}),
}))

const apps = [
  {
    id: '1',
    cleaner_id: 'c1',
    full_name: 'Pending Cleaner',
    avatar_url: null,
    email: 'a@b.com',
    phone: '050',
    bio: 'bio',
    service_types: ['residential' as const],
    hourly_rate: 75,
    years_experience: 2,
    languages: [],
    address: '10 Ben Yehuda St, Tel Aviv',
    status: 'pending' as const,
    submitted_at: '2026-06-10',
    reviewed_at: null,
    id_document_url: null,
    admin_notes: null,
  },
]

describe('ApplicationsList', () => {
  it('renders applicant name, contact, rate, location and links the row to their profile', () => {
    render(<ApplicationsList applications={apps} />)

    expect(screen.getByText('Pending Cleaner')).toBeInTheDocument()
    expect(screen.getByText('a@b.com')).toBeInTheDocument()
    expect(screen.getByText('10 Ben Yehuda St, Tel Aviv')).toBeInTheDocument()

    const link = screen.getByText('Pending Cleaner').closest('a')
    expect(link).toHaveAttribute('href', '/admin/cleaners/c1')
  })

  it('shows a "coming soon" note when Message is clicked, with no inline approve/reject buttons', async () => {
    const user = userEvent.setup()
    render(<ApplicationsList applications={apps} />)

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Message' }))
    expect(screen.getByText(/isn't built yet/)).toBeInTheDocument()
  })

  it('filters by status tab', async () => {
    const user = userEvent.setup()
    render(<ApplicationsList applications={apps} />)

    await user.click(screen.getByRole('button', { name: /Approved \(0\)/ }))
    expect(screen.queryByText('Pending Cleaner')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Pending review \(1\)/ }))
    expect(screen.getByText('Pending Cleaner')).toBeInTheDocument()
  })
})
