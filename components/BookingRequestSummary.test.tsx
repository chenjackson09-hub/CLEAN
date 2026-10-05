import { render, screen } from '@testing-library/react'
import BookingRequestSummary, { type BookingSummaryData } from './BookingRequestSummary'

const data: BookingSummaryData = {
  scheduledDate: '2026-10-15', scheduledStart: '09:00:00', durationHours: 4,
  homeDwellingType: 'house', homeArea: "Ha'adarim 44, Beit Hillel", homeBedrooms: 4, homeBathrooms: 2,
  cleaningType: 'regular', extras: [], petsLabel: '2 dogs', petsPresent: true, hostPresent: false,
  notes: 'Please keep the dogs out', hourlyRate: 90,
}

describe('BookingRequestSummary typography', () => {
  it('titles are bold and the answers are regular weight', () => {
    render(<BookingRequestSummary data={data} cleanerName="Host One" lang="en" />)
    for (const title of ['Date', 'Requested start time', 'Estimated duration', 'Cleaning type', 'Pets', 'Estimated total']) {
      expect(screen.getByText(title).className).toContain('font-bold')
    }
    for (const answer of ['Regular cleaning', '4 hours', '09:00']) {
      const el = screen.getByText(answer)
      expect(el.className).not.toContain('font-bold')
      expect(el.className).not.toContain('font-semibold')
    }
  })
})
