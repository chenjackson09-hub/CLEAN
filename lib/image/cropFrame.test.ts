import { clampPan, cropRect, scaleFor } from './cropFrame'

describe('cropFrame', () => {
  it('at zoom 1 a landscape photo shows its middle square', () => {
    const r = cropRect(2000, 1000, 300, 1, 0, 0)
    expect(r.side).toBeCloseTo(1000)
    expect(r.sx).toBeCloseTo(500)
    expect(r.sy).toBeCloseTo(0)
  })
  it('zooming in shows a smaller part of the photo', () => {
    const r = cropRect(1000, 1000, 300, 2, 0, 0)
    expect(r.side).toBeCloseTo(500)
    expect(r.sx).toBeCloseTo(250)
    expect(r.sy).toBeCloseTo(250)
  })
  it('dragging the image right shows more of its left side', () => {
    const r = cropRect(1000, 1000, 300, 2, 100, 0)
    expect(r.sx).toBeLessThan(250)
  })
  it('cannot be dragged past the edge of the photo', () => {
    const s = scaleFor(1000, 1000, 300, 2)
    const maxX = (1000 * s - 300) / 2
    expect(clampPan(1000, 1000, 300, 2, 99999, -99999)).toEqual({ x: maxX, y: -maxX })
    const r = cropRect(1000, 1000, 300, 2, 99999, 99999)
    expect(r.sx).toBeCloseTo(0)
    expect(r.sy).toBeCloseTo(0)
    expect(clampPan(1000, 1000, 300, 1, 50, 50)).toEqual({ x: 0, y: 0 })
  })
})
