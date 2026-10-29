import { render, screen } from '@testing-library/react'
import FinishProfileBanner from './FinishProfileBanner'

describe('FinishProfileBanner', () => {
  afterEach(() => { document.documentElement.dir = 'ltr' })

  it('links to the wizard it is given', () => {
    render(<FinishProfileBanner href="/register/cleaner" />)
    expect(screen.getByRole('link', { name: 'Finish your profile' })).toHaveAttribute('href', '/register/cleaner')
  })

  it('speaks Hebrew when the page is right-to-left', () => {
    document.documentElement.dir = 'rtl'
    render(<FinishProfileBanner href="/register/customer" />)
    expect(screen.getByRole('link', { name: 'השלמת הפרופיל' })).toBeInTheDocument()
  })
})
