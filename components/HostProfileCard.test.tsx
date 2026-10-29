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

  it('shows Cindy Verified only when an admin has verified the host', () => {
    const { rerender } = render(<HostProfileCard fullName="Dana Cohen" avatarUrl={null} customer={customer} reviews={[]} town="Beit Hillel" />)
    expect(screen.queryByText('Cindy Verified')).not.toBeInTheDocument()
    rerender(<HostProfileCard fullName="Dana Cohen" avatarUrl={null} customer={customer} reviews={[]} town="Beit Hillel" cindyVerified />)
    expect(screen.getByText('Cindy Verified')).toBeInTheDocument()
  })

  it('does not hand out a "Verified" badge just because an admin approved the signup', () => {
    render(<HostProfileCard fullName="Dana Cohen" avatarUrl={null} customer={customer} reviews={[]} town="Beit Hillel" />)
    expect(screen.queryByText(/Verified/i)).not.toBeInTheDocument()
  })

  it('shows home notes by default (the host\'s own profile)', () => {
    render(<HostProfileCard fullName="Dana Cohen" avatarUrl={null} customer={{ ...customer, home_instructions: 'Key under the mat' } as Customer} reviews={[]} />)
    expect(screen.getByText(/Key under the mat/)).toBeInTheDocument()
    expect(screen.queryByText(/shared once you accept/)).not.toBeInTheDocument()
  })

  it('locks the home notes for a cleaner who has not accepted yet', () => {
    render(<HostProfileCard fullName="Dana Cohen" avatarUrl={null} customer={customer} reviews={[]} homeNotesLocked />)
    expect(screen.getByText(/Home notes are shared once you accept/)).toBeInTheDocument()
  })
})
