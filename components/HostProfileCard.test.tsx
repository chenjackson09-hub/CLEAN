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

  it('shows the home photos a cleaner has been given links to, and nothing without them', () => {
    const { rerender } = render(<HostProfileCard fullName="Dana Cohen" avatarUrl={null} customer={customer} reviews={[]} />)
    expect(screen.queryByText('Photos of the home')).not.toBeInTheDocument()
    rerender(<HostProfileCard fullName="Dana Cohen" avatarUrl={null} customer={customer} reviews={[]} homePhotos={['https://signed/a', 'https://signed/b']} />)
    expect(screen.getByText('Photos of the home')).toBeInTheDocument()
    expect(screen.getAllByAltText('Photo of the home')).toHaveLength(2)
    expect(screen.getByText(/because you have a request from them/)).toBeInTheDocument()
  })

  it('shows how many floors the home has, and which floor an apartment is on, with different labels', () => {
    render(<HostProfileCard fullName="Dana Cohen" avatarUrl={null} customer={{ ...customer, num_floors: 2, floor: 3 } as Customer} reviews={[]} />)
    expect(screen.getByText('Floors in the home')).toBeInTheDocument()
    expect(screen.getByText('Apartment floor')).toBeInTheDocument()
  })

  it('shows the About us paragraph first and the typical needs, with a note that each request can differ', () => {
    const c = {
      ...customer, bio: "We are a family of five. We'd love help once a week.",
      usage_frequency: 'twice_monthly', typical_hours: '4.5', preferred_days: ['thu', 'tue'], days_flexible: true,
      cleaning_priorities: ['kitchen', 'dishes'], usual_cleaning_type: 'both',
    } as unknown as Customer
    render(<HostProfileCard fullName="Dana Cohen" avatarUrl={null} customer={c} reviews={[]} />)
    expect(screen.getByText('About us')).toBeInTheDocument()
    expect(screen.getByText(/family of five/)).toBeInTheDocument()
    expect(screen.getByText('Typical needs')).toBeInTheDocument()
    expect(screen.getByText('Twice a month')).toBeInTheDocument()
    expect(screen.getByText('~4.5 hours')).toBeInTheDocument()
    expect(screen.getByText('Tue, Thu')).toBeInTheDocument() // in week order
    expect(screen.getByText('Days · flexible')).toBeInTheDocument()
    expect(screen.getByText('Dishes')).toBeInTheDocument()
    expect(screen.getByText('Regular and deep cleaning')).toBeInTheDocument()
    expect(screen.getByText('Each request may differ from this profile.')).toBeInTheDocument()
  })

  it('shows no About us or Typical needs block for a host who has not filled them in', () => {
    render(<HostProfileCard fullName="Dana Cohen" avatarUrl={null} customer={customer} reviews={[]} />)
    expect(screen.queryByText('About us')).not.toBeInTheDocument()
    expect(screen.queryByText('Typical needs')).not.toBeInTheDocument()
  })
})
