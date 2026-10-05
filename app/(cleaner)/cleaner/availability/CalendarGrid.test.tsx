import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import CalendarGrid from './CalendarGrid'
import type { BookingWithCustomer, CleanerAvailability } from '@/types/database'

const mockUpdate = jest.fn()
const mockDelete = jest.fn()
jest.mock('../../actions', () => ({
  addAvailability: jest.fn(),
  updateAvailability: (...a: unknown[]) => mockUpdate(...a),
  deleteAvailability: (...a: unknown[]) => mockDelete(...a),
}))

const slot = (over: Partial<CleanerAvailability> = {}): CleanerAvailability => ({
  id: 's1', cleaner_id: 'me', date: '2026-10-15', start_time: '09:00:00', end_time: '15:00:00', note: 'Leave at 15 sharp', ...over,
})
const booking = (over: Record<string, unknown>) =>
  ({
    id: 'b1', customer_id: 'c1', cleaner_id: 'me', scheduled_date: '2026-10-15', scheduled_start: '10:00:00',
    duration_hours: 3, address: 'Kibbutz Amir', status: 'pending',
    profiles: { full_name: 'Roni Tyroler', phone: null, avatar_url: null }, ...over,
  }) as unknown as BookingWithCustomer

// Only fake the clock's Date so the calendar opens on October 2026; timers stay real.
beforeAll(() => {
  jest.useFakeTimers({
    now: new Date(2026, 9, 5, 10),
    doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame', 'queueMicrotask'],
  })
})
afterAll(() => jest.useRealTimers())
beforeEach(() => {
  mockUpdate.mockReset().mockResolvedValue({ success: true })
  mockDelete.mockReset().mockResolvedValue({ success: true })
})

const openDay = async (n: number) => {
  const cell = document.querySelector(`[data-date="2026-10-${String(n).padStart(2, '0')}"]`) as HTMLElement
  await userEvent.click(cell)
}

describe('CalendarGrid statuses', () => {
  it('colors a slot with a request on it orange, in the month chips and the day card', async () => {
    render(<CalendarGrid slots={[slot()]} weeklySlots={[]} bookings={[]} pendingBookings={[booking({})]} />)
    expect(screen.getByText('9-15').className).toContain('text-orange-700')

    await openDay(15)
    const link = screen.getByRole('link', { name: /Roni Tyroler · 10:00/ })
    expect(link).toHaveAttribute('href', '/cleaner/requests')
    expect(link.closest('div.bg-orange-100')).not.toBeNull()
    expect(screen.getByText('1 pending')).toBeInTheDocument()
  })

  it('a free slot stays blue', async () => {
    render(<CalendarGrid slots={[slot()]} weeklySlots={[]} bookings={[]} pendingBookings={[]} />)
    expect(screen.getByText('9-15').className).toContain('text-blue-800')
    await openDay(15)
    expect(screen.getByText('6h free')).toBeInTheDocument()
  })

  it('shows a matched clean in green with the host linked and a chat icon, and no end time', async () => {
    render(
      <CalendarGrid
        slots={[]} weeklySlots={[]} pendingBookings={[]}
        bookings={[booking({ id: 'b2', customer_id: 'c2', status: 'accepted', scheduled_date: '2026-10-16' })]}
      />,
    )
    expect(screen.getByText('10:00').className).toContain('text-green-800')
    await openDay(16)

    const name = screen.getByRole('link', { name: 'Roni Tyroler' })
    expect(name).toHaveAttribute('href', '/cleaner/customers/c2')
    expect(name.className).toContain('underline')
    expect(screen.getByRole('link', { name: 'Chat with Roni Tyroler' })).toHaveAttribute('href', '/cleaner/chat/c2')
    expect(screen.getByText(/10:00 · about 3h/)).toBeInTheDocument()
    expect(screen.queryByText(/13:00/)).not.toBeInTheDocument()
  })

  it('shows a request outside every slot as its own orange item', async () => {
    render(<CalendarGrid slots={[slot({ end_time: '12:00:00' })]} weeklySlots={[]} bookings={[]} pendingBookings={[booking({ scheduled_start: '16:00:00' })]} />)
    await openDay(15)
    expect(screen.getByText(/outside your availability/)).toBeInTheDocument()
  })
})

describe('CalendarGrid slot editing', () => {
  it('edits a slot in place, warning first when a pending request would no longer fit', async () => {
    render(<CalendarGrid slots={[slot()]} weeklySlots={[]} bookings={[]} pendingBookings={[booking({})]} />)
    await openDay(15)
    await userEvent.click(screen.getByRole('button', { name: /Edit availability: 09:00–15:00/ }))

    const selects = screen.getAllByRole('combobox')
    await userEvent.selectOptions(selects[2], '12') // "To" hour -> 12:00; the 10:00 + 3h request no longer fits
    expect(screen.getByText(/1 pending request\(s\) won't fit these hours/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('s1', '09:00', '12:00', 'Leave at 15 sharp'))
  })

  it('keeps the note when only the note is edited, and shows no warning', async () => {
    render(<CalendarGrid slots={[slot()]} weeklySlots={[]} bookings={[]} pendingBookings={[]} />)
    await openDay(15)
    await userEvent.click(screen.getByRole('button', { name: /Edit availability/ }))
    expect(screen.queryByText(/won't fit/)).not.toBeInTheDocument()
    const note = screen.getByDisplayValue('Leave at 15 sharp')
    await userEvent.clear(note)
    await userEvent.type(note, 'Flexible')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('s1', '09:00', '15:00', 'Flexible'))
  })

  it('deleting asks to confirm and says what happens to pending requests', async () => {
    render(<CalendarGrid slots={[slot()]} weeklySlots={[]} bookings={[]} pendingBookings={[booking({})]} />)
    await openDay(15)
    await userEvent.click(screen.getByRole('button', { name: /Edit availability/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete this slot' }))
    expect(screen.getByText(/will be cancelled — the host will see “Cleaner no longer available”/)).toBeInTheDocument()
    expect(mockDelete).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }))
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('s1'))
  })

  it('lays the month out to fit the screen: rows share the height, no fixed 90px cells', () => {
    render(<CalendarGrid slots={[]} weeklySlots={[]} bookings={[]} pendingBookings={[]} />)
    const cell = document.querySelector('[data-date="2026-10-15"]') as HTMLElement
    expect(cell.className).toContain('min-h-0')
    expect(cell.className).not.toContain('min-h-[90px]')
    const grid = cell.parentElement!.parentElement as HTMLElement
    expect(grid.style.gridTemplateRows).toMatch(/repeat\(5, minmax\(0, 1fr\)\)/)
    // the key is part of the same screen
    expect(screen.getByText('Free to work')).toBeInTheDocument()
  })

  it('has no red delete X on the card any more', async () => {
    render(<CalendarGrid slots={[slot()]} weeklySlots={[]} bookings={[]} pendingBookings={[]} />)
    await openDay(15)
    expect(screen.queryByTitle('Remove')).not.toBeInTheDocument()
    expect(within(document.body).queryByText('×')).not.toBeInTheDocument()
  })
})
