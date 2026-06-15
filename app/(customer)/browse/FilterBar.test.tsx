import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { FilterBar } from './FilterBar'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

beforeEach(() => jest.clearAllMocks())

async function openDays(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^days/i }))
}

async function openTimeOfDay(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /time of day/i }))
}

describe('FilterBar', () => {
  it('hides the day checkboxes until the Days button is clicked', () => {
    render(<FilterBar />)

    expect(screen.getByRole('button', { name: /^days/i })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /sun/i })).not.toBeInTheDocument()
  })

  it('renders a checkbox for each day of the week plus an All Days checkbox once opened', async () => {
    const user = userEvent.setup()
    render(<FilterBar />)
    await openDays(user)

    expect(screen.getByRole('checkbox', { name: /sun/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /sat/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /all days/i })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(8)
  })

  it('toggles the days panel closed when the Days button is clicked again', async () => {
    const user = userEvent.setup()
    render(<FilterBar />)

    await openDays(user)
    expect(screen.getByRole('checkbox', { name: /sun/i })).toBeInTheDocument()

    await openDays(user)
    expect(screen.queryByRole('checkbox', { name: /sun/i })).not.toBeInTheDocument()
  })

  it('selects every day when the All Days checkbox is clicked', async () => {
    const user = userEvent.setup()
    render(<FilterBar />)
    await openDays(user)

    const allDays = screen.getByRole('checkbox', { name: /all days/i })
    expect(allDays).not.toBeChecked()

    await user.click(allDays)

    for (const day of ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']) {
      expect(screen.getByRole('checkbox', { name: new RegExp(day, 'i') })).toBeChecked()
    }
    expect(allDays).toBeChecked()

    await user.click(allDays)

    for (const day of ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']) {
      expect(screen.getByRole('checkbox', { name: new RegExp(day, 'i') })).not.toBeChecked()
    }
  })

  it('shows the number of selected days on the Days button', async () => {
    const user = userEvent.setup()
    render(<FilterBar />)
    await openDays(user)

    await user.click(screen.getByRole('checkbox', { name: /mon/i }))
    await user.click(screen.getByRole('checkbox', { name: /wed/i }))

    expect(screen.getByRole('button', { name: /days \(2\)/i })).toBeInTheDocument()
  })

  it('hides the time of day checkboxes until the Time of Day button is clicked', () => {
    render(<FilterBar />)

    expect(screen.getByRole('button', { name: /time of day/i })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /morning/i })).not.toBeInTheDocument()
  })

  it('renders a checkbox for morning, noon, evening, night plus an Anytime checkbox once opened', async () => {
    const user = userEvent.setup()
    render(<FilterBar />)
    await openTimeOfDay(user)

    expect(screen.getByRole('checkbox', { name: /anytime/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /morning/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /noon/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /evening/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /night/i })).toBeInTheDocument()
  })

  it('selects every time of day when the Anytime checkbox is clicked', async () => {
    const user = userEvent.setup()
    render(<FilterBar />)
    await openTimeOfDay(user)

    const anytime = screen.getByRole('checkbox', { name: /anytime/i })
    expect(anytime).not.toBeChecked()

    await user.click(anytime)

    for (const time of ['morning', 'noon', 'evening', 'night']) {
      expect(screen.getByRole('checkbox', { name: new RegExp(time, 'i') })).toBeChecked()
    }
    expect(anytime).toBeChecked()

    await user.click(anytime)

    for (const time of ['morning', 'noon', 'evening', 'night']) {
      expect(screen.getByRole('checkbox', { name: new RegExp(time, 'i') })).not.toBeChecked()
    }
  })

  it('shows the number of selected times on the Time of Day button', async () => {
    const user = userEvent.setup()
    render(<FilterBar />)
    await openTimeOfDay(user)

    await user.click(screen.getByRole('checkbox', { name: /morning/i }))
    await user.click(screen.getByRole('checkbox', { name: /evening/i }))

    expect(screen.getByRole('button', { name: /time of day \(2\)/i })).toBeInTheDocument()
  })

  it('renders service type, location fields and search button', () => {
    render(<FilterBar />)

    expect(screen.getByLabelText(/service type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('renders a sort select with price and experience options', () => {
    render(<FilterBar />)

    const sort = screen.getByLabelText(/sort by/i)
    expect(sort).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Price: Low to High' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Price: High to Low' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Experience: High to Low' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Experience: Low to High' })).toBeInTheDocument()
  })

  it('navigates with selected days, time of day, type, location and sort', async () => {
    const user = userEvent.setup()
    render(<FilterBar />)

    await openDays(user)
    await user.click(screen.getByRole('checkbox', { name: /mon/i }))
    await user.click(screen.getByRole('checkbox', { name: /wed/i }))
    await openTimeOfDay(user)
    await user.click(screen.getByRole('checkbox', { name: /morning/i }))
    await user.click(screen.getByRole('checkbox', { name: /evening/i }))
    await user.selectOptions(screen.getByLabelText(/service type/i), 'residential')
    await user.type(screen.getByLabelText(/location/i), 'Tel Aviv')
    await user.selectOptions(screen.getByLabelText(/sort by/i), 'price_asc')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(mockPush).toHaveBeenCalledWith(
      '/browse?type=residential&days=1%2C3&timeOfDay=morning%2Cevening&location=Tel+Aviv&sort=price_asc'
    )
  })

  it('navigates without days, time of day or sort params when none are selected', async () => {
    const user = userEvent.setup()
    render(<FilterBar />)

    await user.selectOptions(screen.getByLabelText(/service type/i), 'commercial')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(mockPush).toHaveBeenCalledWith('/browse?type=commercial')
  })

  it('clears all filters and navigates to /browse when Clear is clicked', async () => {
    const user = userEvent.setup()
    render(<FilterBar defaultValues={{ days: [1, 3], timeOfDay: ['evening'], type: 'commercial', location: 'Haifa', sort: 'price_asc' }} />)

    await user.click(screen.getByRole('button', { name: /clear/i }))

    expect(mockPush).toHaveBeenCalledWith('/browse')
    await openDays(user)
    expect(screen.getByRole('checkbox', { name: /mon/i })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /wed/i })).not.toBeChecked()
    await openTimeOfDay(user)
    expect(screen.getByRole('checkbox', { name: /evening/i })).not.toBeChecked()
    expect(screen.getByLabelText<HTMLSelectElement>(/service type/i).value).toBe('')
    expect(screen.getByLabelText<HTMLInputElement>(/location/i).value).toBe('')
    expect(screen.getByLabelText<HTMLSelectElement>(/sort by/i).value).toBe('')
  })

  it('pre-fills values from defaultValues prop', async () => {
    const user = userEvent.setup()
    render(<FilterBar defaultValues={{ days: [1, 3], timeOfDay: ['morning', 'evening'], type: 'commercial', location: 'Haifa', sort: 'experience_desc' }} />)

    expect(screen.getByRole('button', { name: /days \(2\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /time of day \(2\)/i })).toBeInTheDocument()

    await openDays(user)
    expect(screen.getByRole('checkbox', { name: /mon/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /wed/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /sun/i })).not.toBeChecked()

    await openTimeOfDay(user)
    expect(screen.getByRole('checkbox', { name: /morning/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /evening/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /noon/i })).not.toBeChecked()

    expect(screen.getByLabelText<HTMLSelectElement>(/service type/i).value).toBe('commercial')
    expect(screen.getByLabelText<HTMLInputElement>(/location/i).value).toBe('Haifa')
    expect(screen.getByLabelText<HTMLSelectElement>(/sort by/i).value).toBe('experience_desc')
  })
})
