'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { markBookingsSeen } from '../actions'

// On the bookings page, clear the "newly accepted" nav badge: record the visit
// server-side, then refresh so the layout recomputes the (now zero) count.
export function MarkBookingsSeen() {
  const router = useRouter()
  useEffect(() => {
    markBookingsSeen().then(() => router.refresh())
  }, [router])
  return null
}
