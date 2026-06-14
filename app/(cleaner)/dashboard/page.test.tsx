import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import CleanerDashboardPage from './page'
import { getAllBookings } from '@/lib/mockBookingsStore'

describe('CleanerDashboardPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows only bookings for Sarah M.', () => {
    render(<CleanerDashboardPage />)

    expect(screen.getByText('Maya Cohen')).toBeInTheDocument()
    expect(screen.queryByText(/8 HaArba'a St, Tel Aviv/)).not.toBeInTheDocument()
  })

  it('accepts a pending booking and persists the new status', async () => {
    const user = userEvent.setup()
    render(<CleanerDashboardPage />)

    await user.click(screen.getByRole('button', { name: 'Accept' }))

    expect(getAllBookings().find(b => b.id === '1')?.status).toBe('accepted')
  })

  it('declines a pending booking and persists the new status', async () => {
    const user = userEvent.setup()
    render(<CleanerDashboardPage />)

    await user.click(screen.getByRole('button', { name: 'Deny' }))

    expect(getAllBookings().find(b => b.id === '1')?.status).toBe('declined')
  })
})
