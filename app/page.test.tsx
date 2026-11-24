import { render, screen } from '@testing-library/react'
import Home from './page'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

describe('Home', () => {
  it('shows the welcome splash (the middleware sends signed-in people elsewhere)', () => {
    render(<LanguageProvider><Home /></LanguageProvider>)
    expect(screen.getByLabelText('Cindy')).toBeInTheDocument()
  })
})
