import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageProvider } from './LanguageContext'
import { LanguageToggle } from './LanguageToggle'

describe('LanguageToggle', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows a button to switch to Hebrew when the current language is English', () => {
    render(<LanguageProvider><LanguageToggle /></LanguageProvider>)

    expect(screen.getByRole('button', { name: 'עברית' })).toBeInTheDocument()
  })

  it('switches to a button to switch to English after being clicked', async () => {
    const user = userEvent.setup()
    render(<LanguageProvider><LanguageToggle /></LanguageProvider>)

    await user.click(screen.getByRole('button', { name: 'עברית' }))

    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument()
  })
})
