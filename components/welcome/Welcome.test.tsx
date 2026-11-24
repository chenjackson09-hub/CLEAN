import { render, screen, fireEvent, act } from '@testing-library/react'
import Welcome from './Welcome'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { resetInstallStateForTests } from '@/lib/installState'

const replace = jest.fn()
const push = jest.fn()
const router = { replace, push, refresh: jest.fn(), back: jest.fn(), forward: jest.fn(), prefetch: jest.fn() }
jest.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/', useSearchParams: () => new URLSearchParams() }))

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'

function setup(ua: string, opts: { standalone?: boolean; search?: string } = {}) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
  Object.defineProperty(window.navigator, 'maxTouchPoints', { value: ua === IPHONE ? 5 : 0, configurable: true })
  window.matchMedia = ((q: string) => ({ matches: !!opts.standalone && q.includes('standalone'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as unknown as typeof window.matchMedia
  window.history.pushState({}, '', '/' + (opts.search ?? ''))
  localStorage.clear()
  resetInstallStateForTests()
  replace.mockClear()
  push.mockClear()
}
const renderIt = (signedIn = false) => render(<LanguageProvider><Welcome signedIn={signedIn} /></LanguageProvider>)

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

describe('Welcome', () => {
  it('splash first, then a forced choice between installing and continuing online', () => {
    setup(IPHONE)
    renderIt()
    expect(screen.getByLabelText('Cindy')).toBeInTheDocument()
    expect(screen.queryByText('Welcome to Cindy!')).toBeNull()
    act(() => { jest.advanceTimersByTime(5200) })
    expect(screen.getByText('Welcome to Cindy!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Install the app on my Home Screen/ })).toBeInTheDocument()
    expect(screen.getByText('Recommended')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue online' })).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled() // nobody is sent on until they pick
  })

  it('"Continue online" goes to the login page and is NOT remembered', () => {
    setup(IPHONE)
    renderIt()
    act(() => { jest.advanceTimersByTime(5200) })
    fireEvent.click(screen.getByRole('button', { name: 'Continue online' }))
    expect(push).toHaveBeenCalledWith('/login')
    expect(localStorage.getItem('cindyWelcomeChoice')).toBeNull()
  })

  it('"Install" opens the on-screen steps, and finishing them says to continue on the Home Screen', () => {
    setup(IPHONE)
    renderIt()
    act(() => { jest.advanceTimersByTime(5200) })
    fireEvent.click(screen.getByRole('button', { name: /Install the app on my Home Screen/ }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'I added it' }))
    expect(screen.getByText('Cindy is on your Home Screen!')).toBeInTheDocument()
    expect(screen.getByText(/open Cindy from your Home Screen to sign up or log in there/)).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
    expect(localStorage.getItem('cindyWelcomeChoice')).toBeNull() // installing is not "online"
  })

  it('inside the installed app it goes straight to login after a short splash', () => {
    setup(IPHONE, { standalone: true })
    renderIt()
    act(() => { jest.advanceTimersByTime(3800) })
    expect(replace).not.toHaveBeenCalled() // the splash lingers (about 4 seconds in all)
    act(() => { jest.advanceTimersByTime(700) })
    expect(replace).toHaveBeenCalledWith('/login')
    expect(screen.queryByText('Welcome to Cindy!')).toBeNull()
  })

  it('the splash lingers about 4.6 s and fades out before the choice appears', () => {
    setup(IPHONE)
    renderIt()
    act(() => { jest.advanceTimersByTime(4500) })
    expect(screen.queryByText('Welcome to Cindy!')).toBeNull()
    expect(screen.getByLabelText('Cindy').className).not.toContain('opacity-0')
    act(() => { jest.advanceTimersByTime(200) }) // 4.7 s: the fade has started
    expect(screen.getByLabelText('Cindy').className).toContain('opacity-0')
    act(() => { jest.advanceTimersByTime(500) })
    expect(screen.getByText('Welcome to Cindy!')).toBeInTheDocument()
  })

  it('someone already signed in sees the splash, then fades on to /login (no choice screen)', () => {
    setup(IPHONE)
    renderIt(true)
    act(() => { jest.advanceTimersByTime(3800) })
    expect(replace).not.toHaveBeenCalled()
    act(() => { jest.advanceTimersByTime(700) })
    expect(replace).toHaveBeenCalledWith('/login')
    expect(screen.queryByText('Welcome to Cindy!')).toBeNull()
  })

  it('shows the choice again on the next visit, even after choosing "online" before', () => {
    setup(IPHONE)
    const a = renderIt()
    act(() => { jest.advanceTimersByTime(5200) })
    fireEvent.click(screen.getByRole('button', { name: 'Continue online' }))
    a.unmount()
    renderIt()
    act(() => { jest.advanceTimersByTime(5200) })
    expect(screen.getByText('Welcome to Cindy!')).toBeInTheDocument()
  })

  it('on a computer there is nothing to install, so it goes to login', () => {
    setup(DESKTOP)
    renderIt()
    act(() => { jest.advanceTimersByTime(5200) })
    expect(replace).toHaveBeenCalledWith('/login')
  })

  it('"Install" asks first when this phone already went through the install steps', () => {
    setup(IPHONE)
    localStorage.setItem('cindyAppInstalledHere', '1')
    renderIt()
    act(() => { jest.advanceTimersByTime(5200) })
    fireEvent.click(screen.getByRole('button', { name: /Install the app on my Home Screen/ }))
    expect(screen.getByText('You have already downloaded this app on your home screen')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Yes, download it again' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
