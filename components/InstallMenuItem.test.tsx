import { render, screen, fireEvent } from '@testing-library/react'
import InstallMenuItem from './InstallMenuItem'
import { resetInstallStateForTests, OPEN_GUIDE_EVENT } from '@/lib/installState'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'

function setup(ua: string, standalone = false) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
  Object.defineProperty(window.navigator, 'maxTouchPoints', { value: ua === IPHONE ? 5 : 0, configurable: true })
  window.matchMedia = ((q: string) => ({ matches: standalone && q.includes('standalone'), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as unknown as typeof window.matchMedia
  resetInstallStateForTests()
}

describe('InstallMenuItem', () => {
  it('on a phone: closes the menu and asks for the install steps', () => {
    setup(IPHONE)
    const onPress = jest.fn()
    const asked = jest.fn()
    window.addEventListener(OPEN_GUIDE_EVENT, asked)
    render(<InstallMenuItem lang="en" onPress={onPress} />)
    fireEvent.click(screen.getByRole('button', { name: 'Install the app' }))
    expect(onPress).toHaveBeenCalled()
    expect(asked).toHaveBeenCalled()
    window.removeEventListener(OPEN_GUIDE_EVENT, asked)
  })
  it('is in Hebrew when asked', () => {
    setup(IPHONE)
    render(<InstallMenuItem lang="he" />)
    expect(screen.getByRole('button', { name: 'התקנת האפליקציה' })).toBeInTheDocument()
  })
  it('is not shown inside the installed app or on a computer', () => {
    setup(IPHONE, true)
    const a = render(<InstallMenuItem lang="en" />)
    expect(a.container).toBeEmptyDOMElement()
    a.unmount()
    setup(DESKTOP)
    const b = render(<InstallMenuItem lang="en" />)
    expect(b.container).toBeEmptyDOMElement()
  })
})
