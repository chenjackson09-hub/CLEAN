import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import AdminCleanersPage from './page'
import { getOverrides } from '@/lib/mockAdminOverridesStore'

describe('AdminCleanersPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('lists seeded cleaners', () => {
    render(<AdminCleanersPage />)

    expect(screen.getByText('Sarah M.')).toBeInTheDocument()
    expect(screen.getByText('David K.')).toBeInTheDocument()
  })

  it('persists a deleted cleaner across reload', async () => {
    const user = userEvent.setup()
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    const { unmount } = render(<AdminCleanersPage />)

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    expect(screen.queryByText('Sarah M.')).not.toBeInTheDocument()

    unmount()
    render(<AdminCleanersPage />)

    expect(screen.queryByText('Sarah M.')).not.toBeInTheDocument()
    expect(getOverrides('cleaners')['1']).toEqual({ removed: true })
  })
})
