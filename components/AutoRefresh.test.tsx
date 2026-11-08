import { render } from '@testing-library/react'
import { act } from 'react'
import AutoRefresh from './AutoRefresh'

const refresh = jest.fn()
let path = '/home'
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => path,
}))

beforeEach(() => {
  jest.useFakeTimers()
  refresh.mockClear()
  path = '/home'
})
afterEach(() => jest.useRealTimers())

function advance(ms: number) {
  act(() => {
    jest.advanceTimersByTime(ms)
  })
}

describe('AutoRefresh', () => {
  it('does not refresh before two minutes, then refreshes', () => {
    render(<AutoRefresh />)
    advance(60_000)
    expect(refresh).not.toHaveBeenCalled()
    advance(65_000)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('does not refresh on chat', () => {
    path = '/chat/abc'
    render(<AutoRefresh />)
    advance(300_000)
    expect(refresh).not.toHaveBeenCalled()
  })

  it('does not refresh while a text box is focused', () => {
    const { container } = render(<><AutoRefresh /><textarea /></>)
    container.querySelector('textarea')!.focus()
    advance(300_000)
    expect(refresh).not.toHaveBeenCalled()
  })
})
