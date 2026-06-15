import { screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import AdminBookingsPage from './page'

describe('AdminBookingsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows the existing mock bookings with who requested whom', () => {
    render(<AdminBookingsPage />)
    expect(screen.getByText('Maya Cohen requested Sarah M.')).toBeInTheDocument()
  })
})
