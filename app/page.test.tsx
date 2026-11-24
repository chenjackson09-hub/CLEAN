import { render, screen } from '@testing-library/react'
import Home from './page'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'

const getCurrentUser = jest.fn()
jest.mock('@/lib/supabase/server', () => ({ getCurrentUser: () => getCurrentUser() }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }))

describe('Home', () => {
  it('shows the Cindy splash for a signed-out visitor', async () => {
    getCurrentUser.mockResolvedValue(null)
    render(<LanguageProvider>{await Home()}</LanguageProvider>)
    expect(screen.getByLabelText('Cindy')).toBeInTheDocument()
  })

  it('shows the Cindy splash for a signed-in person too (it then fades on to /login)', async () => {
    getCurrentUser.mockResolvedValue({ id: 'me' })
    render(<LanguageProvider>{await Home()}</LanguageProvider>)
    expect(screen.getByLabelText('Cindy')).toBeInTheDocument()
  })

  it('still shows the splash if the sign-in check fails', async () => {
    getCurrentUser.mockRejectedValue(new Error('network'))
    render(<LanguageProvider>{await Home()}</LanguageProvider>)
    expect(screen.getByLabelText('Cindy')).toBeInTheDocument()
  })
})
