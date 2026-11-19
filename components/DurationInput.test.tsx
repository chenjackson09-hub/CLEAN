import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DurationInput from './DurationInput'

function hidden(container: HTMLElement) {
  return container.querySelector('input[type="hidden"]') as HTMLInputElement
}

describe('DurationInput', () => {
  it('shows hours and minutes and submits the total in minutes', async () => {
    const { container } = render(<DurationInput id="d" name="min_minutes" label="Min" lang="en" defaultMinutes={80} />)
    expect(screen.getByDisplayValue('1 h')).toBeInTheDocument()
    expect(screen.getByDisplayValue('20 min')).toBeInTheDocument()
    expect(hidden(container).value).toBe('80')
    await userEvent.selectOptions(screen.getByLabelText('Min (min)'), '45')
    expect(hidden(container).value).toBe('105')
  })

  it('shows 2 hours as "2 h" + "0 min", and Hebrew units', () => {
    render(<DurationInput id="d" name="x" label="מינימום" lang="he" defaultMinutes={120} />)
    expect(screen.getByDisplayValue('2 ש׳')).toBeInTheDocument()
    expect(screen.getByDisplayValue('0 דק׳')).toBeInTheDocument()
  })

  it('can be "No limit" (empty value) and warns when under 20 minutes', async () => {
    const { container } = render(<DurationInput id="d" name="max_minutes" label="Max" lang="en" defaultMinutes={null} allowNone noneLabel="No limit" />)
    expect(hidden(container).value).toBe('')
    expect(screen.getByDisplayValue('No limit')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByDisplayValue('No limit'), '0')
    await userEvent.selectOptions(screen.getByLabelText('Max (min)'), '10')
    expect(screen.getByText('At least 20 minutes')).toBeInTheDocument()
  })
})
