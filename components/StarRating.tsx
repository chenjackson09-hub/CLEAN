'use client'
import { useState } from 'react'

// Presentational star-rating widgets shared by the customer (useLanguage) and
// cleaner (useLang) sides. Deliberately i18n-free — any labels are passed in by
// the caller so this file doesn't depend on either translation system.

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path d="M9.05 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.539 1.118l-3.366-2.446a1 1 0 00-1.176 0l-3.366 2.446c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.355 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
    </svg>
  )
}

const SIZE = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-7 h-7' } as const

// Read-only average display with fractional fill (e.g. 4.3 ★). When `value` is
// null/undefined the cleaner/customer has no ratings yet — render `emptyLabel`
// (e.g. "New") instead, or nothing if not provided.
export function StarRatingDisplay({
  value,
  count,
  size = 'sm',
  showNumber = true,
  emptyLabel,
  className = '',
}: {
  value: number | null | undefined
  count?: number
  size?: keyof typeof SIZE
  showNumber?: boolean
  emptyLabel?: string
  className?: string
}) {
  if (value == null || (count != null && count === 0)) {
    return emptyLabel ? <span className={`text-sm text-gray-400 ${className}`}>{emptyLabel}</span> : null
  }
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span className="relative inline-flex">
        {/* empty track */}
        <span className="inline-flex text-gray-300">
          {[0, 1, 2, 3, 4].map((i) => (
            <StarIcon key={i} className={SIZE[size]} />
          ))}
        </span>
        {/* filled overlay, clipped to the fractional width */}
        <span className="absolute inset-0 inline-flex overflow-hidden text-amber-400" style={{ width: `${pct}%` }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <StarIcon key={i} className={`${SIZE[size]} shrink-0`} />
          ))}
        </span>
      </span>
      {showNumber && <span className="text-sm font-semibold text-gray-700">{value.toFixed(1)}</span>}
      {count != null && count > 0 && <span className="text-xs text-gray-400">({count})</span>}
    </span>
  )
}

// Interactive whole-star input (1-5). Controlled by `value`; calls `onChange`
// with the picked score. Hover preview included.
export function StarRatingInput({
  value,
  onChange,
  disabled = false,
  size = 'lg',
}: {
  value: number | null
  onChange: (score: number) => void
  disabled?: boolean
  size?: keyof typeof SIZE
}) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value ?? 0
  return (
    <div className="inline-flex" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => !disabled && setHover(n)}
          aria-label={`${n}`}
          className={`p-0.5 transition-colors disabled:cursor-not-allowed ${
            n <= shown ? 'text-amber-400' : 'text-gray-300'
          } ${disabled ? '' : 'hover:text-amber-400'}`}
        >
          <StarIcon className={SIZE[size]} />
        </button>
      ))}
    </div>
  )
}
