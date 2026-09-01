'use client'
import { useEffect, useRef, useState } from 'react'

export function InlineEditableText({
  label,
  value,
  onSave,
  errorText,
}: {
  label: string
  value: string
  onSave: (newValue: string) => Promise<{ error?: string }>
  errorText: (errorKey: string) => string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(value)
  }, [value, editing])

  async function commit() {
    if (draft.trim() === value.trim()) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    const result = await onSave(draft.trim())
    setSaving(false)
    if (result.error) {
      setError(errorText(result.error))
      return
    }
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      setDraft(value)
      setError(null)
      setEditing(false)
    }
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="w-full border border-blue-400 rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-60"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="group w-full flex items-center justify-between gap-2 text-start rounded-lg px-3 py-1.5 -mx-3 hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm text-gray-900">{value || '—'}</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
