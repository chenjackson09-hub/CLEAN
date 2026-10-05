import { render, screen } from '@testing-library/react'
import { DateChip, NextUpStrip, ScheduleBox, ScheduleRow } from './ScheduleParts'

// 2026-10-05 is a Monday (week Sun 4 – Sat 10 Oct).
const TODAY = '2026-10-05'

describe('DateChip', () => {
  it('shows the weekday for dates in the same week, the month otherwise', () => {
    const { rerender } = render(<DateChip dateStr="2026-10-07" todayStr={TODAY} lang="en" />)
    expect(screen.getByText('Wed')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()

    rerender(<DateChip dateStr="2026-09-16" todayStr={TODAY} lang="en" />)
    expect(screen.getByText('Sep')).toBeInTheDocument()
    expect(screen.getByText('16')).toBeInTheDocument()
    expect(screen.queryByText('Wed')).not.toBeInTheDocument()
  })

  it('treats Saturday and the following Sunday as different weeks', () => {
    render(<DateChip dateStr="2026-10-11" todayStr={TODAY} lang="en" />)
    expect(screen.getByText('Oct')).toBeInTheDocument()
  })

  it('an upcoming ("active") chip is a darker grey than the default/past one', () => {
    const { container, rerender } = render(<DateChip dateStr="2026-10-20" todayStr={TODAY} lang="en" tone="active" />)
    expect(container.firstElementChild!.className).toContain('bg-gray-300')
    rerender(<DateChip dateStr="2026-10-20" todayStr={TODAY} lang="en" />)
    expect(container.firstElementChild!.className).toContain('bg-gray-100')
  })

  it('speaks Hebrew', () => {
    render(<DateChip dateStr="2026-10-07" todayStr={TODAY} lang="he" />)
    expect(screen.getByText('יום ד׳')).toBeInTheDocument()
  })
})

describe('ScheduleBox', () => {
  it('scrolls inside itself so a long list cannot push the next section away', () => {
    const { container } = render(
      <ScheduleBox title="Past cleans" count={3} empty="none">
        <div>a</div>
      </ScheduleBox>,
    )
    const scroller = container.querySelector('.overflow-y-auto')
    expect(scroller).not.toBeNull()
    expect(scroller!.className).toMatch(/max-h-\[20vh\]/)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('the fill variant takes the remaining screen height instead of a fixed cap, and still scrolls inside', () => {
    const { container } = render(
      <ScheduleBox fill title="Past cleans" count={3} empty="none">
        <div>a</div>
      </ScheduleBox>,
    )
    const scroller = container.querySelector('.overflow-y-auto')!
    expect(scroller.className).toContain('min-h-0')
    expect(scroller.className).not.toMatch(/max-h-/)
    expect(container.querySelector('section')!.className).toContain('flex-col')
  })

  it('shows the empty message when there is nothing', () => {
    render(
      <ScheduleBox title="Past cleans" count={0} empty="No past cleans yet.">
        {null}
      </ScheduleBox>,
    )
    expect(screen.getByText('No past cleans yet.')).toBeInTheDocument()
  })
})

describe('NextUpStrip', () => {
  it('renders nothing when there is nothing today or tomorrow', () => {
    const { container } = render(<NextUpStrip title="Today & tomorrow" count={0}>{null}</NextUpStrip>)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ScheduleRow', () => {
  it('is clickable and shows title, subtitle and trailing content', () => {
    const onClick = jest.fn()
    render(
      <ScheduleRow dateStr="2026-10-07" todayStr={TODAY} lang="en" title="Dana Levi" subtitle="09:00 · 3h" trailing={<span>Not sure</span>} onClick={onClick} />,
    )
    screen.getByRole('button').click()
    expect(onClick).toHaveBeenCalled()
    expect(screen.getByText('09:00 · 3h')).toBeInTheDocument()
    expect(screen.getByText('Not sure')).toBeInTheDocument()
  })
})
