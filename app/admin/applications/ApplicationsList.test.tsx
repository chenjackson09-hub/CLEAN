import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { ApplicationsList } from './ApplicationsList'
import type { UnifiedApplication } from '@/lib/types/application'

jest.mock('@/app/admin/actions', () => ({
  updateApplicationStatus: jest.fn().mockResolvedValue({}),
  updateApplicationNotes: jest.fn().mockResolvedValue({}),
  updateCustomerApprovalStatus: jest.fn().mockResolvedValue({}),
  updateCustomerNotes: jest.fn().mockResolvedValue({}),
}))

const cleanerApp: UnifiedApplication = {
  id: '1',
  category: 'cleaner',
  personId: 'c1',
  full_name: 'Pending Cleaner',
  avatar_url: null,
  email: 'a@b.com',
  phone: '050',
  hourly_rate: 75,
  address: '10 Ben Yehuda St, Tel Aviv',
  status: 'pending',
  submitted_at: '2026-06-10',
  reviewed_at: null,
  id_document_url: null,
  admin_notes: null,
  cleans_completed: 0,
}

const customerApp: UnifiedApplication = {
  id: 'u1',
  category: 'customer',
  personId: 'u1',
  full_name: 'Pending Customer',
  avatar_url: null,
  email: 'x@y.com',
  phone: '052',
  hourly_rate: null,
  address: '5 Herzl St, Haifa',
  status: 'pending',
  submitted_at: '2026-06-11',
  reviewed_at: null,
  id_document_url: null,
  admin_notes: null,
  cleans_completed: 0,
}

describe('ApplicationsList', () => {
  it('renders applicant name, contact, rate, location and links a cleaner row to their public profile', () => {
    render(<ApplicationsList applications={[cleanerApp]} />)

    expect(screen.getByText('Pending Cleaner')).toBeInTheDocument()
    expect(screen.getByText('a@b.com')).toBeInTheDocument()
    expect(screen.getByText('10 Ben Yehuda St, Tel Aviv')).toBeInTheDocument()

    const link = screen.getByText('Pending Cleaner').closest('a')
    expect(link).toHaveAttribute('href', '/cleaners/c1')
  })

  it('shows a customer row with a dash for rate, no profile link, and a category badge for each row', () => {
    render(<ApplicationsList applications={[cleanerApp, customerApp]} />)

    expect(screen.getByText('Pending Customer')).toBeInTheDocument()
    expect(screen.queryByText('Pending Customer')?.closest('a')).toBeNull()
    expect(screen.getByText('Cleaner')).toBeInTheDocument()
    expect(screen.getByText('Customer')).toBeInTheDocument()
  })

  it('shows a "coming soon" note when Message is clicked, with no inline approve/reject buttons', async () => {
    const user = userEvent.setup()
    render(<ApplicationsList applications={[cleanerApp]} />)

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Message' }))
    expect(screen.getByText(/isn't built yet/)).toBeInTheDocument()
  })

  it('filters by status tab across both categories', async () => {
    const user = userEvent.setup()
    render(<ApplicationsList applications={[cleanerApp, customerApp]} />)

    await user.click(screen.getByRole('button', { name: /Approved \(0\)/ }))
    expect(screen.queryByText('Pending Cleaner')).not.toBeInTheDocument()
    expect(screen.queryByText('Pending Customer')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Pending review \(2\)/ }))
    expect(screen.getByText('Pending Cleaner')).toBeInTheDocument()
    expect(screen.getByText('Pending Customer')).toBeInTheDocument()
  })
})
