import { render, screen, fireEvent, act } from '@testing-library/react'
import InstallPrompt from './InstallPrompt'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'

function setup(ua: string, standalone = false) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
  Object.defineProperty(window.navigator, 'maxTouchPoints', { value: ua === IPHONE || ua === ANDROID ? 5 : 0, configurable: true })
  window.matchMedia = ((q: string) => ({ matches: standalone && q.includes('standalone'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as unknown as typeof window.matchMedia
  localStorage.clear()
}

describe('InstallPrompt', () => {
  it('on an iPhone the card has one big button that opens the step-by-step pop-ups', () => {
    setup(IPHONE)
    render(<InstallPrompt />)
    expect(screen.getByText('Add Cindy to your Home Screen')).toBeInTheDocument()
    expect(screen.getByText('Have Cindy open full screen, like an app.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Let’s do it!' }))
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    expect(screen.getByText('Tap the ⋯ button')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Tap “Share”')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Tap “Add to Home Screen”')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('Tap “Share”')).toBeInTheDocument()
  })

  it('closing the pop-ups with the X keeps the card; finishing all four steps removes it for good', () => {
    setup(IPHONE)
    const { unmount } = render(<InstallPrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Let’s do it!' }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByText('Step 1 of 4')).toBeNull()
    expect(screen.getByText('Add Cindy to your Home Screen')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Let’s do it!' }))
    for (let n = 0; n < 3; n++) fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Tap “Add”')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByText('Add Cindy to your Home Screen')).toBeNull()
    unmount()
    render(<InstallPrompt />)
    expect(screen.queryByText('Add Cindy to your Home Screen')).toBeNull()
  })

  it('“Not now” hides the card and it stays hidden', () => {
    setup(IPHONE)
    const { unmount } = render(<InstallPrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }))
    expect(screen.queryByText('Add Cindy to your Home Screen')).toBeNull()
    unmount()
    render(<InstallPrompt />)
    expect(screen.queryByText('Add Cindy to your Home Screen')).toBeNull()
  })

  it('shows nothing inside the installed app or on a computer', () => {
    setup(IPHONE, true)
    const a = render(<InstallPrompt />)
    expect(a.container).toBeEmptyDOMElement()
    a.unmount()
    setup(DESKTOP)
    const b = render(<InstallPrompt />)
    expect(b.container).toBeEmptyDOMElement()
  })

  it('on Android waits for the browser, then offers a real Install button', async () => {
    setup(ANDROID)
    const { container } = render(<InstallPrompt />)
    expect(container).toBeEmptyDOMElement()
    const prompt = jest.fn().mockResolvedValue(undefined)
    const ev = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) })
    act(() => {
      window.dispatchEvent(ev)
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Let’s do it!' }))
    })
    expect(prompt).toHaveBeenCalled()
  })
})
