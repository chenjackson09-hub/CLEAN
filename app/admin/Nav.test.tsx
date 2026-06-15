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

  it('renders links for applications and booking requests', () => {
    render(<LanguageProvider><Nav /></LanguageProvider>)

    expect(screen.getByRole('link', { name: 'Applications' })).toHaveAttribute('href', '/admin/applications')
    expect(screen.getByRole('link', { name: 'Booking Requests' })).toHaveAttribute('href', '/admin/bookings')
  })

  it('highlights the current page', () => {
    render(<LanguageProvider><Nav /></LanguageProvider>)

    expect(screen.getByRole('link', { name: 'Booking Requests' }).className).toContain('underline')
  })

  it('switches all links to Hebrew when the language is toggled', async () => {
    const user = userEvent.setup()
    render(<LanguageProvider><Nav /></LanguageProvider>)

    await user.click(screen.getByRole('button', { name: 'עברית' }))

    expect(screen.getByRole('link', { name: 'בקשות הצטרפות' })).toHaveAttribute('href', '/admin/applications')
    expect(screen.getByRole('link', { name: 'בקשות הזמנה' })).toHaveAttribute('href', '/admin/bookings')
  })
})
