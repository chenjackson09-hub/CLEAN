import { fireEvent, screen, within } from '@testing-library/react'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { parseFilters } from '@/lib/locations'
import type { LocationRow, Summary } from '@/lib/locationsData'

const push = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/admin/locations',
  useSearchParams: () => new URLSearchParams('status=open'),
}))
const setLocalityStatus = jest.fn(async () => ({ success: true, batch: 'b1', changed: 1 }))
jest.mock('./actions', () => ({
  setLocalityStatus: (...a: unknown[]) => (setLocalityStatus as (...x: unknown[]) => unknown)(...a),
  assignToRegion: jest.fn(),
  undoLocationChange: jest.fn(),
}))

import { ManageView } from './ManageView'

const summary: Summary = {
  total_localities: 1264, open_localities: 1, customers: 4, cleaners: 1,
  waiting_customers: 0, waiting_cleaners: 0, no_area_customers: 2, no_area_cleaners: 0,
}
const row = (over: Partial<LocationRow>): LocationRow => ({
  locality_id: 'l1', cbs_code: 322, name_he: 'בית הלל', name_en: 'Bet Hillel', name_en_display: 'Beit Hillel',
  district: 'הצפון', region_id: null, region_name: null, is_open: true, status_source: 'override',
  customers: 4, cleaners: 1, waiting: 0, ...over,
})

function setup(rows: LocationRow[], filters = parseFilters({ status: 'open' })) {
  return render(
    <ManageView summary={summary} rows={rows} total={rows.length} regions={[]} districts={['הצפון']} filters={filters} page={1} pageSize={25} />,
  )
}

beforeEach(() => { push.mockClear(); setLocalityStatus.mockClear() })

describe('ManageView', () => {
  it('shows the six cards with real totals and highlights the active one', () => {
    setup([row({})])
    expect(screen.getByRole('button', { name: /Total locations/ })).toHaveTextContent('1,264')
    expect(screen.getByRole('button', { name: /Open locations/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Registered cleaners/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText(/2 customers and 0 cleaners haven’t chosen their area/)).toBeInTheDocument()
  })

  it('a card filters the table through the URL', () => {
    setup([row({})])
    fireEvent.click(screen.getByRole('button', { name: /Waiting customers/ }))
    expect(push).toHaveBeenCalledWith(expect.stringContaining('users=waiting_customers'))
    expect(push.mock.calls[0][0]).not.toContain('status=')
  })

  it('shows the display spelling, not the official one', () => {
    setup([row({})])
    expect(screen.getByText('Beit Hillel')).toBeInTheDocument()
    expect(screen.queryByText('Bet Hillel')).toBeNull()
  })

  it('asks before closing an open place, and does nothing if cancelled', () => {
    setup([row({})])
    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'closed' } })
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Close an open location?')).toBeInTheDocument()
    expect(setLocalityStatus).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(setLocalityStatus).not.toHaveBeenCalled()
  })

  it('opens a closed place straight away, with no confirmation', () => {
    setup([row({ is_open: false, status_source: 'default' })], parseFilters({}))
    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'open' } })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(setLocalityStatus).toHaveBeenCalledWith({ ids: ['l1'], status: 'open' })
  })

  it('links the details panel to the existing Customers and Cleaners pages, remembering this view', () => {
    setup([row({})])
    fireEvent.click(screen.getByRole('button', { expanded: false }))
    const customers = screen.getByRole('link', { name: /View customers/ })
    expect(customers.getAttribute('href')).toMatch(/^\/admin\/customers\?locality=l1&back=/)
    expect(decodeURIComponent(customers.getAttribute('href')!.split('back=')[1])).toBe('/admin/locations?status=open')
  })

  it('shows the empty state', () => {
    setup([])
    expect(screen.getByText('No locations match these filters.')).toBeInTheDocument()
  })
})
