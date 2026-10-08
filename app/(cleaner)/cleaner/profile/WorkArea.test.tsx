import { render, screen, fireEvent } from '@testing-library/react'
import { LanguageProvider as LangProvider } from '@/lib/i18n/LanguageContext'
import ProfileForm from './ProfileForm'
import ProfileView from './ProfileView'
import type { Cleaner, Profile } from '@/types/database'

jest.mock('../../actions', () => ({ updateCleanerProfile: jest.fn() }))
jest.mock('next/dynamic', () => () => function Map({ radiusKm }: { radiusKm: number }) {
  return <div data-testid="map" data-radius={radiusKm} />
})
jest.mock('@/lib/image/normalizeImage', () => ({ normalizeImageToJpeg: async (f: File) => f }))

const profile = { id: 'c', full_name: 'Maya Levi', phone: '', avatar_url: null } as unknown as Profile
const cleaner = { id: 'c', address: 'Beit Hillel', service_radius_km: 12, languages: [], cleaning_categories: [], match_preferences: [], work_areas: [] } as unknown as Cleaner
const center = { lat: 33.2, lng: 35.6 }
const wrap = (ui: React.ReactElement) => render(<LangProvider>{ui}</LangProvider>)

describe('Where I work', () => {
  it('the slider drives the map circle and the radius that gets saved', () => {
    const { container } = wrap(<ProfileForm profile={profile} cleaner={cleaner} center={center} />)
    expect(screen.getByTestId('map')).toHaveAttribute('data-radius', '12')
    fireEvent.change(screen.getByLabelText('How far I\'ll travel'), { target: { value: '30' } })
    expect(screen.getByTestId('map')).toHaveAttribute('data-radius', '30')
    expect(container.querySelector('input[name="service_radius_km"]')).toHaveValue('30')
    expect(screen.getByText('Hosts within 30 km of your address can find you.')).toBeInTheDocument()
  })

  it('asks to save an address first when there is no saved point yet', () => {
    wrap(<ProfileForm profile={profile} cleaner={cleaner} center={null} />)
    expect(screen.queryByTestId('map')).not.toBeInTheDocument()
    expect(screen.getByText('Save your address to see your area on the map.')).toBeInTheDocument()
  })

  it('the read-only profile shows the map, or a warning that hosts cannot find them yet', () => {
    const { rerender } = wrap(<ProfileView profile={profile} cleaner={cleaner} center={center} onEdit={() => {}} />)
    expect(screen.getByTestId('map')).toHaveAttribute('data-radius', '12')
    rerender(<LangProvider><ProfileView profile={profile} cleaner={cleaner} center={null} onEdit={() => {}} /></LangProvider>)
    expect(screen.getByText(/hosts can't find you in search yet/)).toBeInTheDocument()
  })
})
