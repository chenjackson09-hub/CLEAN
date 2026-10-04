import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { AvailabilityNotice } from './AvailabilityNotice'

const mockKeep = jest.fn()
const mockCancel = jest.fn()
jest.mock('../actions', () => ({
  acknowledgeAvailabilityNotice: (...a: unknown[]) => mockKeep(...a),
  cancelBooking: (...a: unknown[]) => mockCancel(...a),
}))

beforeEach(() => {
  mockKeep.mockReset().mockResolvedValue({ success: true })
  mockCancel.mockReset().mockResolvedValue({ success: true })
})

describe('AvailabilityNotice', () => {
  it('tells the host who changed what and asks if the request is still relevant', () => {
    render(<AvailabilityNotice bookingId="b1" name="Noa R." times="10:00–13:00" />)
    expect(
      screen.getByText('Notice: Noa R. has changed their available times to 10:00–13:00. Is this request still relevant?'),
    ).toBeInTheDocument()
  })

  it('✓ keeps the request (clears the notice) without cancelling', async () => {
    render(<AvailabilityNotice bookingId="b1" name="Noa R." times="10:00–13:00" />)
    await userEvent.click(screen.getByRole('button', { name: 'Yes, keep this request' }))
    await waitFor(() => expect(mockKeep).toHaveBeenCalledWith('b1'))
    expect(mockCancel).not.toHaveBeenCalled()
  })

  it('✕ cancels the request through the normal cancel flow', async () => {
    render(<AvailabilityNotice bookingId="b1" name="Noa R." times="10:00–13:00" />)
    await userEvent.click(screen.getByRole('button', { name: 'No, cancel this request' }))
    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith('b1'))
    expect(mockKeep).not.toHaveBeenCalled()
  })

  it('shows an error and stays put when the action fails', async () => {
    mockCancel.mockResolvedValue({ error: 'nope' })
    render(<AvailabilityNotice bookingId="b1" name="Noa R." times="10:00–13:00" />)
    await userEvent.click(screen.getByRole('button', { name: 'No, cancel this request' }))
    expect(await screen.findByText('nope')).toBeInTheDocument()
  })
})
