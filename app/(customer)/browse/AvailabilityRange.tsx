'use client'
import { useRef } from 'react'

// Dual-thumb time-range slider for the browse filter: the customer drags both
// ends to say when they're available, from 06:00 to 22:00 in 30-minute steps.
// Controlled by the parent (BrowseFilters) so Clear can reset it; the chosen
// times are mirrored into hidden `from`/`to` inputs the search form reads.

const MIN = 6 * 60 // 06:00
const MAX = 22 * 60 // 22:00
const STEP = 30

function fmt(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
function parse(s: string, fallback: number) {
  const [h, m] = s.split(':').map(Number)
  if (Number.isNaN(h)) return fallback
  return Math.min(MAX, Math.max(MIN, h * 60 + (m || 0)))
}
function snap(m: number) {
  return Math.min(MAX, Math.max(MIN, Math.round((m - MIN) / STEP) * STEP + MIN))
}

export function AvailabilityRange({
  from,
  to,
  onChange,
  labelledBy,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  labelledBy?: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'from' | 'to' | null>(null)
  const fromMin = parse(from, MIN)
  const toMin = parse(to, MAX)

  const pct = (m: number) => ((m - MIN) / (MAX - MIN)) * 100

  function valueAt(clientX: number) {
    const track = trackRef.current
    if (!track) return MIN
    const rect = track.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    return snap(MIN + ratio * (MAX - MIN))
  }

  function onPointerDown(which: 'from' | 'to', e: React.PointerEvent) {
    e.preventDefault()
    dragging.current = which
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return
    const v = valueAt(e.clientX)
    if (dragging.current === 'from') onChange(fmt(Math.min(v, toMin - STEP)), to)
    else onChange(from, fmt(Math.max(v, fromMin + STEP)))
  }
  function onPointerUp(e: React.PointerEvent) {
    dragging.current = null
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  const thumbClass =
    'absolute top-1/2 -translate-y-1/2 -ml-2.5 w-5 h-5 rounded-full bg-white border-2 border-blue-500 shadow cursor-grab active:cursor-grabbing touch-none'

  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-col gap-1.5 w-56 max-w-full">
      <input type="hidden" name="from" value={fmt(fromMin)} />
      <input type="hidden" name="to" value={fmt(toMin)} />
      <div className="flex justify-between text-sm font-semibold text-gray-700 tabular-nums">
        <span>{fmt(fromMin)}</span>
        <span>{fmt(toMin)}</span>
      </div>
      <div ref={trackRef} className="relative h-6 flex items-center select-none">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-200" />
        <div
          className="absolute h-1.5 rounded-full bg-blue-500"
          style={{ left: `${pct(fromMin)}%`, right: `${100 - pct(toMin)}%` }}
        />
        <button
          type="button"
          aria-label="Availability start"
          onPointerDown={(e) => onPointerDown('from', e)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={thumbClass}
          style={{ left: `${pct(fromMin)}%` }}
        />
        <button
          type="button"
          aria-label="Availability end"
          onPointerDown={(e) => onPointerDown('to', e)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={thumbClass}
          style={{ left: `${pct(toMin)}%` }}
        />
      </div>
    </div>
  )
}
