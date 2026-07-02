'use client'
import { useEffect, useRef, useState } from 'react'
import { LANGUAGE_OPTIONS, normalizeLanguages, type LanguageOption } from '@/lib/languages'

type Props = {
  // Languages to offer; defaults to the shared list.
  options?: LanguageOption[]
  // Hidden-input name for plain FormData <form>s (e.g. the cleaner profile edit
  // form, whose server action reads formData.get('languages').split(',')).
  // Omit for controlled forms that read their own state.
  name?: string
  // Controlled selection (the registration form keeps its own `languages`
  // state). When provided the component is controlled; otherwise it manages
  // its own internal state seeded from `defaultValue`.
  value?: string[]
  // Uncontrolled initial selection — normalized to canonical codes so legacy
  // values (full names, old "HE"/"AR"/"RU" codes) pre-select correctly.
  defaultValue?: string[]
  onChange?: (codes: string[]) => void
  // Trigger text shown when nothing is selected, e.g. "Select languages".
  placeholder: string
  className?: string
}

// Multi-select dropdown of languages rendered as short native-script codes
// (EN / עב / عر / РУ …). i18n-neutral: every bit of visible text comes from
// props or the shared language list, so it drops into either translation
// system. It renders a hidden input (works inside a native <form>) AND fires
// onChange (works for controlled callers) — pick whichever the host needs.
export function LanguageMultiSelect({
  options = LANGUAGE_OPTIONS,
  name,
  value,
  defaultValue = [],
  onChange,
  placeholder,
  className = '',
}: Props) {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState<string[]>(() => normalizeLanguages(defaultValue))
  const selected = isControlled ? value! : internal

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Close the panel on click-away or Escape.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function commit(next: string[]) {
    if (!isControlled) setInternal(next)
    onChange?.(next)
  }

  function toggle(code: string) {
    commit(selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code])
  }

  // Full name for a code's chip tooltip (may be missing for a custom value).
  const codeName = new Map(options.map((o) => [o.code, o.name]))

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={selected.join(',')} />}

      {/* Trigger — a div (not a button) so the chip "×" buttons can nest inside
          it without an invalid button-in-button. Keyboard-operable via role. */}
      <div
        role="button"
        tabIndex={0}
        aria-label={placeholder}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen((o) => !o)
          }
        }}
        className="w-full min-h-[42px] cursor-pointer border border-gray-300 rounded-xl px-2 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-1.5 flex-wrap text-start"
      >
        {selected.length === 0 ? (
          <span className="text-gray-400 px-1">{placeholder}</span>
        ) : (
          selected.map((code) => (
            <span
              key={code}
              title={codeName.get(code)}
              className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-sm font-medium ps-2 pe-1 py-0.5 rounded-full"
            >
              {code}
              <button
                type="button"
                aria-label={`Remove ${code}`}
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(code)
                }}
                className="text-blue-400 hover:text-red-600 leading-none text-base"
              >
                ×
              </button>
            </span>
          ))
        )}
        <svg className="w-4 h-4 text-gray-400 ms-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Options list */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
          {options.map((o) => {
            const on = selected.includes(o.code)
            return (
              <button
                key={o.code}
                type="button"
                onClick={() => toggle(o.code)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-start hover:bg-gray-50 ${on ? 'bg-blue-50/50' : ''}`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                  {on && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="inline-flex items-center justify-center min-w-[2.25rem] bg-gray-100 text-gray-700 text-sm font-semibold px-2 py-0.5 rounded-md">
                  {o.code}
                </span>
                <span className="text-base text-gray-700">{o.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
