import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import ApplicationsPage from './page'
import { getAllApplications } from '@/lib/mockApplicationsStore'

describe('ApplicationsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows the existing mock applications', () => {
    render(<ApplicationsPage />)

    expect(screen.getByText('Tamar Avraham')).toBeInTheDocument()
    expect(screen.getByText('Omar Haddad')).toBeInTheDocument()
  })

  it('approves an application and persists the new status', async () => {
    const user = userEvent.setup()
    render(<ApplicationsPage />)

    await user.click(screen.getAllByRole('button', { name: 'Approve' })[0])

    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(getAllApplications().find(a => a.full_name === 'Tamar Avraham')?.status).toBe('approved')
  })

  it('rejects an application and persists the new status', async () => {
    const user = userEvent.setup()
    render(<ApplicationsPage />)

    await user.click(screen.getAllByRole('button', { name: 'Reject' })[1])

    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(getAllApplications().find(a => a.full_name === 'Omar Haddad')?.status).toBe('rejected')
  })
})
