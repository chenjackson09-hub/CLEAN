import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { Nav } from './Nav'

jest.mock('next/navigation', () => ({
  usePathname: () => '/bookings',
}))

describe('Nav', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders links for browse, bookings and profile', () => {
    render(<LanguageProvider><Nav /></LanguageProvider>)

    expect(screen.getByRole('link', { name: 'Browse Cleaners' })).toHaveAttribute('href', '/browse')
    expect(screen.getByRole('link', { name: 'My Bookings' })).toHaveAttribute('href', '/bookings')
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile')
  })

  it('highlights the current page', () => {
    render(<LanguageProvider><Nav /></LanguageProvider>)

    expect(screen.getByRole('link', { name: 'My Bookings' }).className).toContain('underline')
  })

  it('switches all links to Hebrew when the language is toggled', async () => {
    const user = userEvent.setup()
    render(<LanguageProvider><Nav /></LanguageProvider>)

    await user.click(screen.getByRole('button', { name: 'עברית' }))

    expect(screen.getByRole('link', { name: 'חיפוש מנקים' })).toHaveAttribute('href', '/browse')
    expect(screen.getByRole('link', { name: 'ההזמנות שלי' })).toHaveAttribute('href', '/bookings')
    expect(screen.getByRole('link', { name: 'פרופיל' })).toHaveAttribute('href', '/profile')
  })
})
