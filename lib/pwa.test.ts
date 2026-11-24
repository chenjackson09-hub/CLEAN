import { installHintFor, isAndroidDevice, isIosDevice, isIosInAppBrowser } from './pwa'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
const IPAD_AS_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36'

describe('device detection', () => {
  it('recognises iPhone and iPad (which looks like a Mac but has a touch screen)', () => {
    expect(isIosDevice(IPHONE, 5)).toBe(true)
    expect(isIosDevice(IPAD_AS_MAC, 5)).toBe(true)
  })
  it('does not treat a real Mac or an Android phone as iOS', () => {
    expect(isIosDevice(IPAD_AS_MAC, 0)).toBe(false)
    expect(isIosDevice(ANDROID, 5)).toBe(false)
  })
  it('recognises Android', () => {
    expect(isAndroidDevice(ANDROID)).toBe(true)
    expect(isAndroidDevice(IPHONE)).toBe(false)
  })
})

describe('installHintFor', () => {
  const base = { standalone: false, dismissed: false, ios: false, android: false, canPrompt: false }
  it('shows nothing inside the installed app or once dismissed', () => {
    expect(installHintFor({ ...base, ios: true, standalone: true })).toBe('none')
    expect(installHintFor({ ...base, ios: true, dismissed: true })).toBe('none')
  })
  it('iPhone always gets the written steps', () => {
    expect(installHintFor({ ...base, ios: true })).toBe('ios')
  })
  it('Android only gets a hint when the browser offered the install button', () => {
    expect(installHintFor({ ...base, android: true })).toBe('none')
    expect(installHintFor({ ...base, android: true, canPrompt: true })).toBe('android')
  })
  it('computers get nothing', () => {
    expect(installHintFor(base)).toBe('none')
  })
})

describe('isIosInAppBrowser', () => {
  it('spots another app’s built-in browser but not Safari', () => {
    expect(isIosInAppBrowser(IPHONE + ' Instagram 300.0')).toBe(true)
    expect(isIosInAppBrowser(IPHONE + ' [FBAN/FBIOS;FBAV/450]')).toBe(true)
    expect(isIosInAppBrowser(IPHONE)).toBe(false)
  })
})
