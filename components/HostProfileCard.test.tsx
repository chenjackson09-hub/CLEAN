import { render, screen } from '@testing-library/react'
import HostProfileCard from './HostProfileCard'
import type { Customer } from '@/types/database'

const customer = {
  id: 'h1', status: 'approved', address: 'Herzl 5, apt 12, בית הלל', dwelling_type: 'apartment', bedrooms: 3, bathrooms: 2,
  rating_avg: 4.9, rating_count: 3, cleans_completed: 3, pet_types: [], cleaning_priorities: [],
} as unknown as Customer

describe('HostProfileCard privacy and honesty', () => {
  it('shows the town only — never the street address', () => {
    render(<HostProfileCard fullName="Dana Cohen" avatarUrl={null} customer={customer} reviews={[]} town="Beit Hillel" />)
    expect(screen.getByText('Beit Hillel')).toBeInTheDocument()
    expect(screen.queryByText(/Herzl/)).not.toBeInTheDocument()
    expect(screen.queryByText(/apt 12/)).not.toBeInTheDocument()
  })

  it('shows no location line when the host has not chosen a town (still no street)', () => {
    render(<HostProfileCard fullName="Dana Cohen" avatarUrl={null} customer={customer} reviews={[]} />)
    expect(screen.queryByText(/Herzl/)).not.toBeInTheDocument()
  })

  it('does not hand out a "Verified" badge just because an admin approved the signup', () => {
    render(<HostProfileCard fullName="Dana Cohen" avatarUrl={null} customer={customer} reviews={[]} town="Beit Hillel" />)
    expect(screen.queryByText(/Verified/i)).not.toBeInTheDocument()
  })
})
