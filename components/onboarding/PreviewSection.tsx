"use client"

import type { ReactNode } from "react"

// One block of the "this is what people will see" preview, with its own Edit button that
// jumps back to the screen where that answer is given.
export default function PreviewSection({ title, editLabel, onEdit, children }: { title?: string; editLabel: string; onEdit: () => void; children: ReactNode }) {
  return (
    <div className="py-3 border-t border-gray-100 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {title && <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{title}</p>}
          {children}
        </div>
        <button type="button" onClick={onEdit} className="text-sm text-blue-600 underline shrink-0">
          {editLabel}
        </button>
      </div>
    </div>
  )
}
