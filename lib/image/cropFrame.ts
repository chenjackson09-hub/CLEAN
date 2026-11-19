// The maths of "frame your photo": a square frame (`size` px on screen) over an image of
// natural size natW x natH. At zoom 1 the image just covers the frame (its short side fits);
// zoom makes it larger; pan moves it (positive x = image moves right), never far enough to
// leave an empty edge inside the frame.
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const MIN_ZOOM = 1
export const MAX_ZOOM = 4

export function scaleFor(natW: number, natH: number, size: number, zoom: number): number {
  return (size / Math.min(natW, natH)) * zoom
}

export function clampPan(natW: number, natH: number, size: number, zoom: number, panX: number, panY: number) {
  const s = scaleFor(natW, natH, size, zoom)
  const maxX = Math.max(0, (natW * s - size) / 2)
  const maxY = Math.max(0, (natH * s - size) / 2)
  return { x: clamp(panX, -maxX, maxX), y: clamp(panY, -maxY, maxY) }
}

// The square of the ORIGINAL image that is inside the frame (source pixels).
export function cropRect(natW: number, natH: number, size: number, zoom: number, panX: number, panY: number) {
  const z = clamp(zoom, MIN_ZOOM, MAX_ZOOM)
  const { x, y } = clampPan(natW, natH, size, z, panX, panY)
  const s = scaleFor(natW, natH, size, z)
  const side = size / s
  const sx = (natW * s) / 2 / s - side / 2 - x / s
  const sy = (natH * s) / 2 / s - side / 2 - y / s
  return {
    sx: clamp(sx, 0, natW - side),
    sy: clamp(sy, 0, natH - side),
    side,
  }
}
