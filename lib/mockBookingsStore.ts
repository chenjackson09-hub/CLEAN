import { MOCK_BOOKINGS } from './mockData/bookings'
import type { BookingResult, BookingStatus } from './types/booking'

const STORAGE_KEY = 'clean_mock_bookings'

export function getStoredBookings(): BookingResult[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addBooking(booking: BookingResult): void {
  const existing = getStoredBookings()
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([booking, ...existing]))
}

export function getAllBookings(): BookingResult[] {
  const stored = getStoredBookings()
  const storedIds = new Set(stored.map(b => b.id))
  return [...stored, ...MOCK_BOOKINGS.filter(b => !storedIds.has(b.id))]
}

export function updateBookingStatus(id: string, status: BookingStatus): void {
  const stored = getStoredBookings()
  const existing = stored.find(b => b.id === id)

  if (existing) {
    const updated = stored.map(b => (b.id === id ? { ...b, status } : b))
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return
  }

  const seed = MOCK_BOOKINGS.find(b => b.id === id)
  if (!seed) return

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...seed, status }, ...stored]))
}
