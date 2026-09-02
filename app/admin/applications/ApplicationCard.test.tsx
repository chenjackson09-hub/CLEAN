import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { ApplicationCard } from './ApplicationCard'
import type { CleanerApplicationResult } from '@/lib/types/application'

const baseApplication: CleanerApplicationResult = {
  id: '1',
  full_name: 'Tamar Avraham',
  email: 'tamar.avraham@example.com',
  phone: '054-111-2222',
  bio: 'Experienced residential cleaner, available weekday mornings.',
  service_types: ['residential'],
  hourly_rate: 75,
  years_experience: 4,
  languages: ['HE', 'EN'],
  address: '10 Ben Yehuda St, Tel Aviv',
  status: 'pending',
  submitted_at: '2026-06-10',
  id_document_url: null,
  admin_notes: null,
  avatar_url: null,
  reviewed_at: null,
  cleans_completed: 0,
}

describe('ApplicationCard', () => {
  it('renders applicant name, bio, address and submitted date', () => {
    render(<ApplicationCard application={baseApplication} onUpdateStatus={jest.fn()} onSaveNotes={jest.fn()} />)

    expect(screen.getByText('Tamar Avraham')).toBeInTheDocument()
    expect(screen.getByText(/Experienced residential cleaner/)).toBeInTheDocument()
    expect(screen.getByText(/10 Ben Yehuda St, Tel Aviv/)).toBeInTheDocument()
    expect(screen.getByText(/2026-06-10/)).toBeInTheDocument()
  })

  it('renders rate, experience and languages', () => {
    render(<ApplicationCard application={baseApplication} onUpdateStatus={jest.fn()} onSaveNotes={jest.fn()} />)

    expect(screen.getByText('₪75/hr')).toBeInTheDocument()
    expect(screen.getByText(/4 yrs exp/)).toBeInTheDocument()
    expect(screen.getByText(/HE, EN/)).toBeInTheDocument()
  })

  it('renders the service type badge', () => {
    render(<ApplicationCard application={baseApplication} onUpdateStatus={jest.fn()} onSaveNotes={jest.fn()} />)
    expect(screen.getByText('Residential')).toBeInTheDocument()
  })

  it('renders both badge when application has residential + commercial', () => {
    render(<ApplicationCard application={{ ...baseApplication, service_types: ['residential', 'commercial'] }} onUpdateStatus={jest.fn()} onSaveNotes={jest.fn()} />)
    expect(screen.getByText('Both')).toBeInTheDocument()
  })

  it('renders the pending status badge and Approve/Reject buttons for pending applications', () => {
    render(<ApplicationCard application={baseApplication} onUpdateStatus={jest.fn()} onSaveNotes={jest.fn()} />)

    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument()
  })

  it('calls onUpdateStatus with "approved" when Approve is clicked', async () => {
    const user = userEvent.setup()
    const onUpdateStatus = jest.fn()
    render(<ApplicationCard application={baseApplication} onUpdateStatus={onUpdateStatus} onSaveNotes={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Approve' }))

    expect(onUpdateStatus).toHaveBeenCalledWith('1', 'approved', '')
  })

  it('calls onUpdateStatus with "rejected" when Reject is clicked', async () => {
    const user = userEvent.setup()
    const onUpdateStatus = jest.fn()
    render(<ApplicationCard application={baseApplication} onUpdateStatus={onUpdateStatus} onSaveNotes={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Reject' }))

    expect(onUpdateStatus).toHaveBeenCalledWith('1', 'rejected', '')
  })

  it('does not render Approve/Reject buttons for approved applications', () => {
    render(<ApplicationCard application={{ ...baseApplication, status: 'approved' }} onUpdateStatus={jest.fn()} onSaveNotes={jest.fn()} />)

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('does not render Approve/Reject buttons for rejected applications', () => {
    render(<ApplicationCard application={{ ...baseApplication, status: 'rejected' }} onUpdateStatus={jest.fn()} onSaveNotes={jest.fn()} />)

    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument()
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })

  it('renders the Needs Info action for pending applications and calls onUpdateStatus', async () => {
    const user = userEvent.setup()
    const onUpdateStatus = jest.fn()
    render(<ApplicationCard application={baseApplication} onUpdateStatus={onUpdateStatus} onSaveNotes={jest.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Needs Info' }))

    expect(onUpdateStatus).toHaveBeenCalledWith('1', 'needs_info', '')
  })

  it('still shows action buttons for needs_info applications', () => {
    render(<ApplicationCard application={{ ...baseApplication, status: 'needs_info' }} onUpdateStatus={jest.fn()} onSaveNotes={jest.fn()} />)

    expect(screen.getAllByText('Needs Info').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
  })

  it('saves admin notes', async () => {
    const user = userEvent.setup()
    const onSaveNotes = jest.fn()
    render(<ApplicationCard application={baseApplication} onUpdateStatus={jest.fn()} onSaveNotes={onSaveNotes} />)

    await user.type(screen.getByPlaceholderText('Write a note about this person...'), 'Missing reference')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSaveNotes).toHaveBeenCalledWith('1', 'Missing reference')
  })
})
