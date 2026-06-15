import { screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLanguage as render } from '@/lib/i18n/testUtils'
import { BookingRequestForm } from './BookingRequestForm'
import { getStoredBookings } from '@/lib/mockBookingsStore'
import type { CleanerResult } from '@/lib/types/cleaner'

const cleaner: CleanerResult = {
  id: 'abc-123',
  full_name: 'Sarah M.',
  avatar_url: null,
  bio: 'Reliable and thorough.',
  service_types: ['residential', 'commercial'],
  hourly_rate: 80,
  years_experience: 5,
  languages: ['EN', 'HE'],
  distance_km: 2.1,
  area: 'Tel Aviv',
  email: 'sarah.m@example.com',
  phone: '050-222-1111',
}

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /request booking/i }))
}

describe('BookingRequestForm', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('hides the form fields until Request Booking is clicked', () => {
    render(<BookingRequestForm cleaner={cleaner} />)

    expect(screen.getByRole('button', { name: /request booking/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/date/i)).not.toBeInTheDocument()
  })

  it('shows the form fields when Request Booking is clicked', async () => {
    const user = userEvent.setup()
    render(<BookingRequestForm cleaner={cleaner} />)
    await openForm(user)

    expect(screen.getByLabelText(/service type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/duration/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
  })

  it('only lists service types the cleaner offers', async () => {
    const user = userEvent.setup()
    render(<BookingRequestForm cleaner={{ ...cleaner, service_types: ['commercial'] }} />)
    await openForm(user)

    expect(screen.getByRole('option', { name: 'Commercial' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Residential' })).not.toBeInTheDocument()
  })

  it('requires date, start time and address', async () => {
    const user = userEvent.setup()
    render(<BookingRequestForm cleaner={cleaner} />)
    await openForm(user)

    expect(screen.getByLabelText(/date/i)).toBeRequired()
    expect(screen.getByLabelText(/start time/i)).toBeRequired()
    expect(screen.getByLabelText(/address/i)).toBeRequired()
  })

  it('cancels back to the Request Booking button', async () => {
    const user = userEvent.setup()
    render(<BookingRequestForm cleaner={cleaner} />)
    await openForm(user)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByRole('button', { name: /request booking/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/date/i)).not.toBeInTheDocument()
  })

  it('shows a confirmation after submitting the form', async () => {
    const user = userEvent.setup()
    render(<BookingRequestForm cleaner={cleaner} />)
    await openForm(user)

    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-07-01' } })
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '09:00' } })
    await user.type(screen.getByLabelText(/address/i), '12 Rothschild Blvd, Tel Aviv')
    await user.click(screen.getByRole('button', { name: /send request/i }))

    expect(screen.getByText(/booking request sent/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/date/i)).not.toBeInTheDocument()
  })

  it('adds the booking to the mock bookings store on submit', async () => {
    const user = userEvent.setup()
    render(<BookingRequestForm cleaner={cleaner} />)
    await openForm(user)

    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-07-01' } })
    fireEvent.change(screen.getByLabelText(/start time/i), { target: { value: '09:00' } })
    await user.type(screen.getByLabelText(/address/i), '12 Rothschild Blvd, Tel Aviv')
    await user.click(screen.getByRole('button', { name: /send request/i }))

    const stored = getStoredBookings()
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      cleaner_name: cleaner.full_name,
      service_type: cleaner.service_types[0],
      scheduled_date: '2026-07-01',
      scheduled_start: '09:00',
      duration_hours: 2,
      address: '12 Rothschild Blvd, Tel Aviv',
      status: 'pending',
      cleaner_email: 'sarah.m@example.com',
      cleaner_phone: '050-222-1111',
      customer_email: 'maya.cohen@example.com',
      customer_phone: '050-111-1111',
    })
  })
})
