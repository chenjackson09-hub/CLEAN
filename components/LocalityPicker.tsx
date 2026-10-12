'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { PickedLocality } from '@/lib/localities/address'

// Pick an Israeli locality (city, kibbutz, moshav, community…) by typing in
// Hebrew or English. Suggestions come from /api/localities/search as you type
// (nothing is downloaded up front). i18n-agnostic: it takes a plain `lang`, like
// the other components shared by the customer, cleaner and auth screens.
const STRINGS = {
  en: {
    placeholder: 'Start typing your town, kibbutz or moshav…',
    change: 'Change',
    searching: 'Searching…',
    none: 'No match. Try a different spelling.',
    error: 'Search is unavailable right now. Please try again.',
    types: {
      city: 'City', local_council: 'Local council', kibbutz: 'Kibbutz', moshav: 'Moshav',
      moshav_shitufi: 'Moshav shitufi', community: 'Community', village: 'Village', bedouin_tribe: 'Bedouin tribe', other: 'Locality',
    } as Record<string, string>,
  },
  he: {
    placeholder: 'התחילו להקליד עיר, קיבוץ או מושב…',
    change: 'שינוי',
    searching: 'מחפש…',
    none: 'לא נמצאה התאמה. נסו איות אחר.',
    error: 'החיפוש לא זמין כרגע. נסו שוב.',
    types: {
      city: 'עיר', local_council: 'מועצה מקומית', kibbutz: 'קיבוץ', moshav: 'מושב',
      moshav_shitufi: 'מושב שיתופי', community: 'יישוב קהילתי', village: 'כפר', bedouin_tribe: 'שבט בדווי', other: 'יישוב',
    } as Record<string, string>,
  },
} as const

type Result = PickedLocality & { cbs_code?: number }

export default function LocalityPicker({
  lang,
  value,
  onChange,
  id,
  autoFocus,
  placeholder,
}: {
  lang: 'en' | 'he'
  value: PickedLocality | null
  onChange: (locality: PickedLocality | null) => void
  id?: string
  autoFocus?: boolean
  placeholder?: string
}) {
  const s = STRINGS[lang]
  const reactId = useId()
  const listId = `${reactId}-list`
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const abort = useRef<AbortController | null>(null)

  // Debounced search; a newer keystroke cancels the older request.
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setState('idle')
      return
    }
    setState('loading')
    const timer = setTimeout(async () => {
      abort.current?.abort()
      const controller = new AbortController()
      abort.current = controller
      try {
        const res = await fetch(`/api/localities/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        const body = await res.json()
        if (controller.signal.aborted) return
        setResults(body.results ?? [])
        setState(body.error ? 'error' : 'done')
        setActive(0)
      } catch {
        if (!controller.signal.aborted) setState('error')
      }
    }, 150)
    return () => clearTimeout(timer)
  }, [query])

  function pick(r: Result) {
    onChange({
      id: r.id, name_he: r.name_he, name_en: r.name_en, locality_type: r.locality_type,
      regional_council: r.regional_council, lat: r.lat, lng: r.lng,
    })
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      pick(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // A chosen locality: shown as a chip with a way to change it.
  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {lang === 'he' || !value.name_en ? value.name_he : `${value.name_en} — ${value.name_he}`}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {s.types[value.locality_type] ?? s.types.other}
            {value.regional_council ? ` · ${value.regional_council}` : ''}
          </p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="shrink-0 text-sm font-semibold text-blue-600 hover:underline">
          {s.change}
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus={autoFocus}
        dir="auto"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? s.placeholder}
        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && query.trim() && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          {state === 'loading' && results.length === 0 && <li className="px-3 py-2.5 text-sm text-gray-400">{s.searching}</li>}
          {state === 'error' && <li className="px-3 py-2.5 text-sm text-red-600">{s.error}</li>}
          {state === 'done' && results.length === 0 && <li className="px-3 py-2.5 text-sm text-gray-500">{s.none}</li>}
          {results.map((r, i) => (
            <li
              key={r.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault() // keep focus so the click lands before blur
                pick(r)
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 ${i === active ? 'bg-blue-50' : ''}`}
            >
              <p className="text-sm font-medium text-gray-900">
                {r.name_en ? `${r.name_en} — ${r.name_he}` : r.name_he}
              </p>
              <p className="text-xs text-gray-500">
                {s.types[r.locality_type] ?? s.types.other}
                {r.regional_council ? ` · ${r.regional_council}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
