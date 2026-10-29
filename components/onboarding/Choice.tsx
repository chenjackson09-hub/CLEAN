"use client"

import type { ReactNode } from "react"

const ON = "border-blue-500 bg-blue-50 text-blue-700"
const OFF = "border-gray-300 bg-white text-gray-700"

export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`px-3 py-1.5 rounded-full border text-sm ${selected ? ON : OFF}`}>
      {children}
    </button>
  )
}

export function OptionCard({ selected, onClick, title, hint }: { selected: boolean; onClick: () => void; title: ReactNode; hint?: ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`text-start px-3.5 py-3 rounded-xl border text-sm ${selected ? ON : OFF}`}>
      <span className="font-medium">{title}</span>
      {hint && <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>}
    </button>
  )
}

export function Stepper({ value, onChange, min = 0, max = 50, step = 1, label, suffix }: { value: string; onChange: (v: string) => void; min?: number; max?: number; step?: number; label: string; suffix?: string }) {
  const n = value === "" ? null : Number(value)
  const set = (next: number) => onChange(String(Math.min(max, Math.max(min, next))))
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" aria-label={`${label} −`} onClick={() => set((n ?? min) - step)} className="w-9 h-9 rounded-full border border-gray-300 text-lg leading-none text-gray-700 hover:bg-gray-50">−</button>
      <span className="min-w-[3.5rem] text-center text-base font-semibold text-gray-900">{n === null ? "–" : n}{suffix ? ` ${suffix}` : ""}</span>
      <button type="button" aria-label={`${label} +`} onClick={() => set((n ?? min) + step)} className="w-9 h-9 rounded-full border border-gray-300 text-lg leading-none text-gray-700 hover:bg-gray-50">+</button>
    </div>
  )
}
