'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import type { Circle, Map as LeafletMap } from 'leaflet'
import { straightKmForRoadKm } from '@/lib/roadDistance'

// "Where I work": a fixed home point and a circle for how far the cleaner will
// travel. An illustration, not a navigator — it never asks for the phone's
// location and can't be dragged, so scrolling the page past it works normally.
// `radiusKm` is the travel distance BY ROAD (what the cleaner sets and what search
// compares against); the circle is drawn at the matching straight-line distance.
// Leaflet + OpenStreetMap tiles (free, no API key); leaflet is imported inside
// the effect so it only ever loads in the browser.
export default function WorkAreaMap({
  center,
  radiusKm,
  label,
  className = 'h-56',
}: {
  center: { lat: number; lng: number }
  radiusKm: number
  label: string
  className?: string
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  const circle = useRef<Circle | null>(null)
  const radius = useRef(straightKmForRoadKm(radiusKm))
  radius.current = straightKmForRoadKm(radiusKm)

  // (Re)build the map when the home point changes.
  useEffect(() => {
    let cancelled = false
    let resizer: ResizeObserver | undefined
    ;(async () => {
      try {
        const L = (await import('leaflet')).default
        if (cancelled || !el.current) return
        const m = L.map(el.current, {
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
          touchZoom: false,
        })
        m.attributionControl.setPrefix(false)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '© OpenStreetMap',
        }).addTo(m)
        const c = L.circle([center.lat, center.lng], {
          radius: radius.current * 1000,
          color: '#2563eb',
          weight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
        }).addTo(m)
        L.circleMarker([center.lat, center.lng], {
          radius: 7,
          color: '#ffffff',
          weight: 3,
          fillColor: '#2563eb',
          fillOpacity: 1,
        }).addTo(m)
        // The circle's own getBounds() needs a view already set, so frame it from
        // the centre + radius directly.
        m.fitBounds(L.latLng(center.lat, center.lng).toBounds(radius.current * 2000), { padding: [12, 12], animate: false })
        map.current = m
        circle.current = c
        // Re-measure if the container resizes after the first paint (layout settling,
        // orientation change), otherwise a strip of the map stays grey.
        if (typeof ResizeObserver !== 'undefined') {
          resizer = new ResizeObserver(() => {
            m.invalidateSize()
            m.fitBounds(c.getLatLng().toBounds(radius.current * 2000), { padding: [12, 12], animate: false })
          })
          resizer.observe(el.current)
        }
      } catch (e) {
        console.error('WorkAreaMap: could not draw the map', e)
      }
    })()
    return () => {
      cancelled = true
      resizer?.disconnect()
      map.current?.remove()
      map.current = null
      circle.current = null
    }
  }, [center.lat, center.lng])

  // The slider just resizes the circle and re-frames it.
  useEffect(() => {
    const c = circle.current
    const m = map.current
    if (!c || !m) return
    c.setRadius(radius.current * 1000)
    m.fitBounds(c.getLatLng().toBounds(radius.current * 2000), { padding: [12, 12], animate: false })
  }, [radiusKm])

  return <div ref={el} role="img" aria-label={label} className={`w-full ${className} rounded-2xl overflow-hidden bg-gray-100 z-0`} />
}
