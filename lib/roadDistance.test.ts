import { estimateRoadKm, straightKmForRoadKm, ROAD_DETOUR_FACTOR } from './roadDistance'

describe('road distance estimate', () => {
  it('turns a 10 km straight line into about 12 km by road (Beit Hillel → Metula)', () => {
    expect(estimateRoadKm(10)).toBeCloseTo(12)
  })
  it('is the exact inverse for the map circle', () => {
    expect(straightKmForRoadKm(estimateRoadKm(7))).toBeCloseTo(7)
    expect(straightKmForRoadKm(12)).toBeCloseTo(12 / ROAD_DETOUR_FACTOR)
  })
})
