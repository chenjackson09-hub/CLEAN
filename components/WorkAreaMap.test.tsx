import { render, screen, waitFor } from '@testing-library/react'
import WorkAreaMap from './WorkAreaMap'

// Leaflet itself needs a real layout engine; here we check the wiring: the map is
// framed from the centre + radius (never circle.getBounds(), which needs a view
// already set) and the circle is resized when the slider moves.
const setRadius = jest.fn()
const fitBounds = jest.fn()
const toBounds = jest.fn(() => 'bounds')
const circleObj = { addTo: () => circleObj, setRadius, getLatLng: () => ({ toBounds }) }
const mapObj = {
  attributionControl: { setPrefix: jest.fn() },
  fitBounds,
  remove: jest.fn(),
  invalidateSize: jest.fn(),
}
jest.mock('leaflet', () => ({
  __esModule: true,
  default: {
    map: () => mapObj,
    tileLayer: () => ({ addTo: jest.fn() }),
    circle: jest.fn(() => circleObj),
    circleMarker: () => ({ addTo: jest.fn() }),
    latLng: () => ({ toBounds }),
  },
}))
jest.mock('leaflet/dist/leaflet.css', () => ({}), { virtual: true })

describe('WorkAreaMap', () => {
  beforeEach(() => jest.clearAllMocks())

  it('draws the map around the home point, sized from the radius', async () => {
    render(<WorkAreaMap center={{ lat: 33.2, lng: 35.57 }} radiusKm={15} label="Map" />)
    expect(screen.getByRole('img', { name: 'Map' })).toBeInTheDocument()
    await waitFor(() => expect(fitBounds).toHaveBeenCalled())
    expect(toBounds).toHaveBeenCalledWith(15 * 2000)
  })

  it('resizes the circle when the radius changes', async () => {
    const { rerender } = render(<WorkAreaMap center={{ lat: 33.2, lng: 35.57 }} radiusKm={15} label="Map" />)
    await waitFor(() => expect(fitBounds).toHaveBeenCalled())
    rerender(<WorkAreaMap center={{ lat: 33.2, lng: 35.57 }} radiusKm={30} label="Map" />)
    await waitFor(() => expect(setRadius).toHaveBeenCalledWith(30000))
  })
})
