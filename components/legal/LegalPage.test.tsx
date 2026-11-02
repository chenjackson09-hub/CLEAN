import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import LegalPage from './LegalPage'

describe('LegalPage', () => {
  it('shows the Terms of Use with every section, the draft notice and a link to the Privacy Policy', () => {
    render(<LegalPage kind="terms" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Use' })).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('Test version')
    expect(screen.getByRole('heading', { name: /Prices and payment/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
  })

  it('shows the Privacy Policy, and switches to Hebrew', async () => {
    const user = userEvent.setup()
    render(<LegalPage kind="privacy" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /עברית|HE|he/i }))
    expect(await screen.findByRole('heading', { level: 1, name: 'מדיניות פרטיות' })).toBeInTheDocument()
  })
})
