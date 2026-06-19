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

  it('renders links for applications, booking requests, cleaners, and customers', () => {
    render(<LanguageProvider><Nav /></LanguageProvider>)

    expect(screen.getByRole('link', { name: 'Applications' })).toHaveAttribute('href', '/admin/applications')
    expect(screen.getByRole('link', { name: 'Booking Requests' })).toHaveAttribute('href', '/admin/bookings')
    expect(screen.getByRole('link', { name: 'Cleaners' })).toHaveAttribute('href', '/admin/cleaners')
    expect(screen.getByRole('link', { name: 'Customers' })).toHaveAttribute('href', '/admin/customers')
  })

  it('does not render the temporarily-hidden availability link', () => {
    render(<LanguageProvider><Nav /></LanguageProvider>)

    expect(screen.queryByRole('link', { name: 'Availability' })).toBeNull()
  })

  it('highlights the current page', () => {
    render(<LanguageProvider><Nav /></LanguageProvider>)

    expect(screen.getByRole('link', { name: 'Booking Requests' }).className).toContain('bg-blue-50')
  })

  it('switches all links to Hebrew when the language is toggled', async () => {
    const user = userEvent.setup()
    render(<LanguageProvider><Nav /></LanguageProvider>)

    // Language toggle lives inside the Settings dropdown
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: 'HE' }))

    expect(screen.getByRole('link', { name: 'בקשות הצטרפות' })).toHaveAttribute('href', '/admin/applications')
    expect(screen.getByRole('link', { name: 'בקשות הזמנה' })).toHaveAttribute('href', '/admin/bookings')
    expect(screen.getByRole('link', { name: 'מנקים' })).toHaveAttribute('href', '/admin/cleaners')
    expect(screen.getByRole('link', { name: 'לקוחות' })).toHaveAttribute('href', '/admin/customers')
  })
})
