import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'

const setCindyVerified = jest.fn()
jest.mock('./verification', () => ({ setCindyVerified: (...a: unknown[]) => setCindyVerified(...a) }))

import { CindyVerifyControl } from './CindyVerifyControl'

beforeEach(() => setCindyVerified.mockReset())

describe('CindyVerifyControl', () => {
  it('an unverified person shows "Not verified" and a Cindy Verify button that verifies them by hand', async () => {
    setCindyVerified.mockResolvedValue({ success: true, verifiedAt: '2026-10-28T10:00:00Z' })
    const onChange = jest.fn()
    render(<CindyVerifyControl kind="cleaner" id="c1" verifiedAt={null} onChange={onChange} />)
    expect(screen.getByText('Not verified')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cindy Verify' }))
    expect(setCindyVerified).toHaveBeenCalledWith({ kind: 'cleaner', id: 'c1', verified: true })
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('2026-10-28T10:00:00Z'))
  })

  it('a verified person shows the badge and the date, and removing needs a confirmation', async () => {
    setCindyVerified.mockResolvedValue({ success: true, verifiedAt: null })
    const onChange = jest.fn()
    render(<CindyVerifyControl kind="customer" id="h1" verifiedAt="2026-10-01T00:00:00Z" onChange={onChange} />)
    expect(screen.getByText('Cindy Verified', { selector: 'span.inline-flex' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Remove verification' }))
    expect(setCindyVerified).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Yes, remove' }))
    expect(setCindyVerified).toHaveBeenCalledWith({ kind: 'customer', id: 'h1', verified: false })
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null))
  })

  it('shows an error and does not change anything when the action fails', async () => {
    setCindyVerified.mockResolvedValue({ error: 'Unauthorized' })
    const onChange = jest.fn()
    render(<CindyVerifyControl kind="cleaner" id="c1" verifiedAt={null} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cindy Verify' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unauthorized')
    expect(onChange).not.toHaveBeenCalled()
  })
})
