import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CancelRegistration from './CancelRegistration'

const mockCancel = jest.fn()
jest.mock('@/app/(auth)/actions', () => ({ cancelUnfinishedRegistration: (...a: unknown[]) => mockCancel(...a) }))

const labels = { cancel: 'Cancel registration', warn: 'This deletes your account.', yes: 'Yes, delete', no: 'No, keep' }

describe('CancelRegistration', () => {
  beforeEach(() => mockCancel.mockReset())

  it('asks before deleting anything', () => {
    render(<CancelRegistration labels={labels} />)
    fireEvent.click(screen.getByText('Cancel registration'))
    expect(screen.getByText('This deletes your account.')).toBeInTheDocument()
    expect(mockCancel).not.toHaveBeenCalled()
  })

  it('"No" closes the question without deleting', () => {
    render(<CancelRegistration labels={labels} />)
    fireEvent.click(screen.getByText('Cancel registration'))
    fireEvent.click(screen.getByText('No, keep'))
    expect(screen.getByText('Cancel registration')).toBeInTheDocument()
    expect(mockCancel).not.toHaveBeenCalled()
  })

  it('"Yes" calls the action and shows its error if it fails', async () => {
    mockCancel.mockResolvedValue({ error: 'Could not delete.' })
    render(<CancelRegistration labels={labels} />)
    fireEvent.click(screen.getByText('Cancel registration'))
    fireEvent.click(screen.getByText('Yes, delete'))
    await waitFor(() => expect(screen.getByText('Could not delete.')).toBeInTheDocument())
    expect(mockCancel).toHaveBeenCalledTimes(1)
  })
})
