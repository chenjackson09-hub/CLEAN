import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import AdminCustomersPage from './page'
import { getOverrides } from '@/lib/mockAdminOverridesStore'

describe('AdminCustomersPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('lists seeded customers', () => {
    render(<AdminCustomersPage />)

    expect(screen.getByText('Maya Cohen')).toBeInTheDocument()
    expect(screen.getByText('Noa Shapira')).toBeInTheDocument()
  })

  it('persists a deleted customer across reload', async () => {
    const user = userEvent.setup()
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    const { unmount } = render(<AdminCustomersPage />)

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    expect(screen.queryByText('Maya Cohen')).not.toBeInTheDocument()

    unmount()
    render(<AdminCustomersPage />)

    expect(screen.queryByText('Maya Cohen')).not.toBeInTheDocument()
    expect(getOverrides('customers')['1']).toEqual({ removed: true })
  })
})
