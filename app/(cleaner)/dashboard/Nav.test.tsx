import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { Nav } from './Nav'

describe('Nav', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders the brand and a language toggle', () => {
    render(<LanguageProvider><Nav /></LanguageProvider>)

    expect(screen.getByText('✨ Clean Cleaner')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'עברית' })).toBeInTheDocument()
  })

  it('switches the language toggle label to English when clicked', async () => {
    const user = userEvent.setup()
    render(<LanguageProvider><Nav /></LanguageProvider>)

    await user.click(screen.getByRole('button', { name: 'עברית' }))

    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
  })
})
