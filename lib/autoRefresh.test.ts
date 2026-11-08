import { isAutoRefreshPath, isTypingTarget, shouldAutoRefresh, AUTO_REFRESH_MS } from './autoRefresh'

function el(html: string): Element {
  const d = document.createElement('div')
  d.innerHTML = html
  return d.firstElementChild as Element
}
const base = { hidden: false, online: true, pathname: '/home', activeElement: null }

describe('autoRefresh', () => {
  it('is every two minutes', () => expect(AUTO_REFRESH_MS).toBe(120000))

  it('skips chat and sign-up pages, allows the rest', () => {
    expect(isAutoRefreshPath('/chat/abc')).toBe(false)
    expect(isAutoRefreshPath('/cleaner/chat')).toBe(false)
    expect(isAutoRefreshPath('/register/cleaner')).toBe(false)
    expect(isAutoRefreshPath('/home')).toBe(true)
    expect(isAutoRefreshPath('/cleaner/requests')).toBe(true)
    expect(isAutoRefreshPath('/chatty')).toBe(true)
  })

  it('treats text fields as typing but not buttons or checkboxes', () => {
    expect(isTypingTarget(el('<textarea></textarea>'))).toBe(true)
    expect(isTypingTarget(el('<input type="text">'))).toBe(true)
    expect(isTypingTarget(el('<select></select>'))).toBe(true)
    expect(isTypingTarget(el('<input type="checkbox">'))).toBe(false)
    expect(isTypingTarget(el('<button></button>'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })

  it('refreshes only when visible, online, on a normal page and not typing', () => {
    expect(shouldAutoRefresh(base)).toBe(true)
    expect(shouldAutoRefresh({ ...base, hidden: true })).toBe(false)
    expect(shouldAutoRefresh({ ...base, online: false })).toBe(false)
    expect(shouldAutoRefresh({ ...base, pathname: '/chat/x' })).toBe(false)
    expect(shouldAutoRefresh({ ...base, activeElement: el('<textarea></textarea>') })).toBe(false)
  })
})
