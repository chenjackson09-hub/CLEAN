import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LanguageProvider, useLanguage } from './LanguageContext'

function Probe() {
  const { lang, dir, t, toggleLanguage } = useLanguage()
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="dir">{dir}</span>
      <span data-testid="text">{t('nav.browse')}</span>
      <button onClick={toggleLanguage}>toggle</button>
    </div>
  )
}

describe('LanguageProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to English with ltr direction', () => {
    render(<LanguageProvider><Probe /></LanguageProvider>)

    expect(screen.getByTestId('lang')).toHaveTextContent('en')
    expect(screen.getByTestId('dir')).toHaveTextContent('ltr')
    expect(screen.getByTestId('text')).toHaveTextContent('Browse Cleaners')
  })

  it('toggles to Hebrew with rtl direction and translated text', async () => {
    const user = userEvent.setup()
    render(<LanguageProvider><Probe /></LanguageProvider>)

    await user.click(screen.getByRole('button', { name: 'toggle' }))

    expect(screen.getByTestId('lang')).toHaveTextContent('he')
    expect(screen.getByTestId('dir')).toHaveTextContent('rtl')
    expect(screen.getByTestId('text')).toHaveTextContent('חיפוש מנקים')
  })

  it('persists the chosen language across remounts', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<LanguageProvider><Probe /></LanguageProvider>)
    await user.click(screen.getByRole('button', { name: 'toggle' }))
    unmount()

    render(<LanguageProvider><Probe /></LanguageProvider>)

    expect(await screen.findByTestId('lang')).toHaveTextContent('he')
  })

  it('fills in {placeholder} variables', async () => {
    function VarProbe() {
      const { t } = useLanguage()
      return <span data-testid="text">{t('bookingRequestForm.confirmation', { name: 'Sarah M.' })}</span>
    }
    render(<LanguageProvider><VarProbe /></LanguageProvider>)

    expect(screen.getByTestId('text')).toHaveTextContent('Booking request sent to Sarah M.!')
  })
})
