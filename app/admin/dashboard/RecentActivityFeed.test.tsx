import { screen } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { RecentActivityFeed } from './RecentActivityFeed'

const now = new Date().toISOString()

describe('RecentActivityFeed schedule events', () => {
  it('flags a cleaner deleting a slot that carried pending requests with a "!"', () => {
    render(
      <RecentActivityFeed
        bookings={[]}
        events={[{ id: 'e1', kind: 'slot_deleted', created_at: now, cleaner_name: 'Noa Rosen', affected_count: 2, detail: '2026-10-15' }]}
      />,
    )
    expect(screen.getByLabelText('May need attention')).toHaveTextContent('!')
    expect(screen.getByText(/deleted an availability slot — 2 pending request\(s\) cancelled/)).toBeInTheDocument()
    expect(screen.getByText('Noa Rosen')).toBeInTheDocument()
  })

  it('flags changed times and shows them', () => {
    render(
      <RecentActivityFeed
        bookings={[]}
        events={[{ id: 'e2', kind: 'slot_changed', created_at: now, cleaner_name: 'Noa Rosen', affected_count: 1, detail: '2026-10-15 · 09:00–12:00' }]}
      />,
    )
    expect(screen.getByText(/changed their available times \(2026-10-15 · 09:00–12:00\) — 1 pending request\(s\)/)).toBeInTheDocument()
  })

  it('still renders plain booking activity alongside events', () => {
    render(
      <RecentActivityFeed
        bookings={[{ id: 'b1', status: 'accepted', created_at: now, cleaner_name: 'Noa Rosen', customer_name: 'Dana Levi' }]}
        events={[]}
      />,
    )
    expect(screen.getByText('Dana Levi')).toBeInTheDocument()
    expect(screen.queryByLabelText('May need attention')).not.toBeInTheDocument()
  })
})
