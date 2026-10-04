import { render, screen, fireEvent } from '@testing-library/react'
import HelpWidget from './HelpWidget'

jest.mock('next/navigation', () => ({ usePathname: () => '/cleaner/availability' }))
jest.mock('@/lib/actions/support', () => ({ sendSupportMessage: jest.fn() }))

beforeAll(() => {
  // jsdom has no PointerEvent; MouseEvent carries the coordinates we need.
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
    }
  }
  ;(window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill
  Object.assign(HTMLElement.prototype, {
    setPointerCapture: jest.fn(),
    releasePointerCapture: jest.fn(),
    hasPointerCapture: () => false,
  })
})
beforeEach(() => window.localStorage.clear())

const bubble = () => screen.getByRole('button', { name: 'Need help?' })

describe('HelpWidget dragging', () => {
  it('moves with a drag, remembers the spot, and does not open on the drag release', () => {
    render(<HelpWidget />)
    fireEvent.pointerDown(bubble(), { clientX: 300, clientY: 600, pointerId: 1 })
    fireEvent.pointerMove(bubble(), { clientX: 120, clientY: 300, pointerId: 1 })
    fireEvent.pointerUp(bubble(), { clientX: 120, clientY: 300, pointerId: 1 })
    fireEvent.click(bubble())

    expect(bubble().style.left).not.toBe('')
    expect(bubble().style.top).not.toBe('')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem('helpWidgetPos')!)).toHaveProperty('x')
  })

  it('still opens on a plain tap', () => {
    render(<HelpWidget />)
    fireEvent.pointerDown(bubble(), { clientX: 10, clientY: 10, pointerId: 1 })
    fireEvent.pointerUp(bubble(), { clientX: 10, clientY: 10, pointerId: 1 })
    fireEvent.click(bubble())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('never sits under the header when dragged to the very top', () => {
    render(<HelpWidget />)
    fireEvent.pointerDown(bubble(), { clientX: 300, clientY: 600, pointerId: 1 })
    fireEvent.pointerMove(bubble(), { clientX: 300, clientY: -50, pointerId: 1 })
    fireEvent.pointerUp(bubble(), { clientX: 300, clientY: -50, pointerId: 1 })
    expect(parseInt(bubble().style.top)).toBeGreaterThanOrEqual(112)
  })
})
