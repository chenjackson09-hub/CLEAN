import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import type { BookingResult } from '@/lib/types/booking'

const mockRate = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }) }))
jest.mock('../actions', () => ({
  cancelBooking: jest.fn(), acknowledgeBookingModified: jest.fn(), acknowledgeAvailabilityNotice: jest.fn(),
  rateCleaner: (...a: unknown[]) => mockRate(...a),
}))

import { BookingDetailModal } from './BookingDetailModal'

const booking = (over: Partial<BookingResult> = {}): BookingResult => ({
  id: 'b1', cleaner_id: 'c1', cleaner_name: 'Maya Levi', cleaner_avatar_url: null, service_type: 'residential',
  scheduled_date: '2026-09-05', scheduled_start: '09:00', duration_hours: 3, address: '12 Herzl, Haifa', status: 'completed', ...over,
})

beforeEach(() => { jest.clearAllMocks(); mockRate.mockResolvedValue({ success: true }) })

describe('host review of a completed clean', () => {
  it('only offers the written review once a star rating exists', () => {
    render(<BookingDetailModal booking={booking({ my_rating: null })} onClose={() => {}} />)
    expect(screen.queryByPlaceholderText(/short review of this cleaner/i)).not.toBeInTheDocument()
  })

  it('saves the review together with the rating the host already gave', async () => {
    const user = userEvent.setup()
    render(<BookingDetailModal booking={booking({ my_rating: 4 })} onClose={() => {}} />)
    await user.type(screen.getByPlaceholderText(/short review of this cleaner/i), 'Left the place spotless')
    await user.click(screen.getByRole('button', { name: 'Save review' }))
    await waitFor(() => expect(mockRate).toHaveBeenCalledWith('b1', 4, 'Left the place spotless'))
    expect(await screen.findByText('Review saved')).toBeInTheDocument()
  })

  it('starts from the review that was already written', () => {
    render(<BookingDetailModal booking={booking({ my_rating: 5, my_review_text: 'Wonderful' })} onClose={() => {}} />)
    expect(screen.getByDisplayValue('Wonderful')).toBeInTheDocument()
  })
})
