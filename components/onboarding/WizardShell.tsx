"use client"

import type { ReactNode } from "react"

// The frame both sign-up wizards share: "Step X of N" with a bar, the screen's content, and a
// Back / Continue bar fixed to the bottom of the screen so it is always within thumb reach.
// It owns no language of its own — every label is passed in by the page.
export default function WizardShell({
  stepLabel, progress, topRight, onClose, closeLabel, error, back, next, skip, children,
}: {
  stepLabel: string
  progress: number // 0..1
  topRight?: ReactNode
  onClose: () => void
  closeLabel: string
  error?: string | null
  back: { label: string; onClick: () => void; hidden?: boolean }
  next: { label: string; onClick: () => void; disabled?: boolean }
  skip?: { label: string; onClick: () => void }
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full max-w-lg mx-auto flex-1 flex flex-col px-4 pt-4 pb-40">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-900">{stepLabel}</span>
          <div className="flex items-center gap-2">
            {topRight}
            <button type="button" aria-label={closeLabel} onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-6" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="bg-white rounded-2xl shadow p-5 sm:p-6 flex-1">
          {children}
          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-4">
              {error}
            </p>
          )}
        </div>
      </div>
      <div className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200">
        <div className="w-full max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={back.onClick}
              className={`px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 ${back.hidden ? "invisible" : ""}`}
            >
              {back.label}
            </button>
            <button
              type="button"
              disabled={next.disabled}
              onClick={next.onClick}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {next.label}
            </button>
          </div>
          {skip && (
            <div className="text-center mt-2">
              <button type="button" onClick={skip.onClick} className="text-sm text-gray-500 underline">
                {skip.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
