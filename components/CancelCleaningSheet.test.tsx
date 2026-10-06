import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CancelCleaningSheet from './CancelCleaningSheet'

function setup(role: 'host' | 'cleaner', onConfirm = jest.fn().mockResolvedValue({ success: true })) {
  const onClose = jest.fn()
  const onDone = jest.fn()
  render(
    <CancelCleaningSheet
      lang="en" role={role} date="2026-10-13" start="10:00:00" durationHours={3} hourlyRate={80}
      otherName="Maya Levi" onConfirm={onConfirm} onClose={onClose} onDone={onDone}
    />,
  )
  return { onConfirm, onClose, onDone }
}

describe('CancelCleaningSheet', () => {
  it('shows exactly what is being cancelled and does not cancel on its own', () => {
    const { onConfirm } = setup('host')
    expect(screen.getByText('Cancel this cleaning?')).toBeInTheDocument()
    expect(screen.getByText(/Tuesday 13 October · 10:00/)).toBeInTheDocument()
    expect(screen.getByText(/about 3 h · ₪80\/hour/)).toBeInTheDocument()
    expect(screen.getByText('With Maya Levi')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('needs an explicit final confirmation, with the consequence for the host', async () => {
    const { onConfirm } = setup('host')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText(/Maya will be notified that the cleaning was cancelled. Their time will become available again./)).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel cleaning' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ reason: null, message: null }))
    expect(await screen.findByText('Cleaning cancelled')).toBeInTheDocument()
  })

  it('tells the cleaner Cindy will help the host find someone else, and sends the reason and note', async () => {
    const { onConfirm } = setup('cleaner')
    await userEvent.click(screen.getByLabelText('Something unexpected happened'))
    await userEvent.type(screen.getByRole('textbox'), 'Sorry!')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.getByText(/Cindy will help them find another cleaner/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancel cleaning' }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ reason: 'unexpected', message: 'Sorry!' }))
  })

  it('uses the cleaner’s wording for "no longer need"', () => {
    setup('cleaner')
    expect(screen.getByLabelText('I can no longer do this job')).toBeInTheDocument()
  })

  it('"Keep booking" closes without cancelling', async () => {
    const { onClose, onConfirm } = setup('host')
    await userEvent.click(screen.getByRole('button', { name: 'Keep booking' }))
    expect(onClose).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('a stale screen gets a calm "already cancelled" instead of an error', async () => {
    const { onDone } = setup('host', jest.fn().mockResolvedValue({ error: 'x', alreadyCancelled: true }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel cleaning' }))
    expect(await screen.findByText('Already cancelled')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onDone).toHaveBeenCalled()
  })

  it('a failure keeps the dialog open so it can be retried', async () => {
    setup('host', jest.fn().mockResolvedValue({ error: 'boom' }))
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel cleaning' }))
    expect(await screen.findByText('Could not cancel. Please try again.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel cleaning' })).toBeEnabled()
  })
})
