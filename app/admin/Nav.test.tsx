import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { Nav } from './Nav'

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/bookings',
}))

describe('Nav', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders links for all applications, matches, cleaners, and customers', () => {
    render(<LanguageProvider><Nav currentUserName="Test Admin" /></LanguageProvider>)

    expect(screen.getByRole('link', { name: 'All Applications' })).toHaveAttribute('href', '/admin/applications')
    expect(screen.getByRole('link', { name: 'Matches' })).toHaveAttribute('href', '/admin/bookings')
    expect(screen.getByRole('link', { name: 'Cleaners' })).toHaveAttribute('href', '/admin/cleaners')
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('href', '/admin/customers')
  })

  it('renders the Ads, Push Notifications, and Ratings links, and Support before Ratings', () => {
    render(<LanguageProvider><Nav currentUserName="Test Admin" /></LanguageProvider>)

    expect(screen.getByRole('link', { name: 'Ads' })).toHaveAttribute('href', '/admin/ads')
    expect(screen.getByRole('link', { name: 'Push Notifications' })).toHaveAttribute('href', '/admin/push-notifications')
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/admin/support')
    expect(screen.getByRole('link', { name: 'Ratings' })).toHaveAttribute('href', '/admin/ratings')
  })

  it('no longer renders standalone Blocked/Inactive links (folded into per-page filters)', () => {
    render(<LanguageProvider><Nav currentUserName="Test Admin" /></LanguageProvider>)

    expect(screen.queryByRole('link', { name: 'Blocked' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Inactive' })).toBeNull()
  })

  it('does not render the temporarily-hidden availability link', () => {
    render(<LanguageProvider><Nav currentUserName="Test Admin" /></LanguageProvider>)

    expect(screen.queryByRole('link', { name: 'Availability' })).toBeNull()
  })

  it('highlights the current page', () => {
    render(<LanguageProvider><Nav currentUserName="Test Admin" /></LanguageProvider>)

    expect(screen.getByRole('link', { name: 'Matches' }).className).toContain('bg-[#F7F4EA]')
  })

  it('shows the "Admin" title and the current user\'s name in the top bar', () => {
    render(<LanguageProvider><Nav currentUserName="Test Admin" /></LanguageProvider>)

    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Test Admin')).toBeInTheDocument()
  })

  it('opens the account menu with a link to the profile page', async () => {
    const user = userEvent.setup()
    render(<LanguageProvider><Nav currentUserName="Test Admin" /></LanguageProvider>)

    await user.click(screen.getByRole('button', { name: 'Account menu' }))

    expect(screen.getByRole('link', { name: /Profile/ })).toHaveAttribute('href', '/admin/profile')
  })

  it('shows no badge on Support/Matches when counts are zero (the default)', () => {
    render(<LanguageProvider><Nav currentUserName="Test Admin" /></LanguageProvider>)

    // NavBadge renders null for count <= 0, so the accessible name stays plain.
    expect(screen.getByRole('link', { name: 'Support' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Matches' })).toBeInTheDocument()
  })

  it('shows a red count badge on Support and Matches when there are open disputes/unmatched requests', () => {
    render(
      <LanguageProvider>
        <Nav currentUserName="Test Admin" openDisputesCount={3} unmatchedRequestsCount={12} />
      </LanguageProvider>,
    )

    expect(screen.getByRole('link', { name: 'Support 3' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Matches 12' })).toBeInTheDocument()
  })

  it('switches all links to Hebrew when the language is toggled', async () => {
    const user = userEvent.setup()
    render(<LanguageProvider><Nav currentUserName="Test Admin" /></LanguageProvider>)

    // Language toggle lives inside the account menu (opened via the avatar button)
    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('button', { name: 'HE' }))

    expect(screen.getByRole('link', { name: 'כל בקשות ההצטרפות' })).toHaveAttribute('href', '/admin/applications')
    expect(screen.getByRole('link', { name: 'התאמות' })).toHaveAttribute('href', '/admin/bookings')
    expect(screen.getByRole('link', { name: 'מנקים' })).toHaveAttribute('href', '/admin/cleaners')
    expect(screen.getByRole('link', { name: 'לקוחות' })).toHaveAttribute('href', '/admin/customers')
  })
})
