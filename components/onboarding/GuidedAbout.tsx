"use client"

import { useId, useState } from "react"
import { ABOUT_MAX, applyStarter, assembleAbout } from "@/lib/onboarding/aboutMe"

export type AboutPrompt = { label: string; starters: string[]; placeholder?: string }

// "Tell people about yourself" without a blank page: a few short prompts with tap-to-use
// sentence starters, and one box underneath that holds the final text and stays freely
// editable. No AI — the text is only ever what the person typed.
export default function GuidedAbout({
  value, onChange, prompts, boxLabel, rebuildLabel, max = ABOUT_MAX,
}: {
  value: string
  onChange: (v: string) => void
  prompts: AboutPrompt[]
  boxLabel: string
  rebuildLabel: string
  max?: number
}) {
  const uid = useId()
  const single = prompts.length === 1
  const [answers, setAnswers] = useState<string[]>(() => prompts.map(() => ""))
  // Once the person edits the box directly, the prompts stop rewriting it.
  const [manual, setManual] = useState(value.trim() !== "")

  function setAnswer(i: number, text: string) {
    const next = answers.map((a, idx) => (idx === i ? text : a))
    setAnswers(next)
    if (!manual) onChange(assembleAbout(next, max))
  }

  if (single) {
    const p = prompts[0]
    return (
      <div>
        <label htmlFor={`${uid}-0`} className="block text-sm font-medium text-gray-800 mb-1.5">{p.label}</label>
        <div className="flex gap-1.5 flex-wrap mb-2">
          {p.starters.map((s) => (
            <button key={s} type="button" onClick={() => onChange(applyStarter(value, s))} className="px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-xs text-gray-600 hover:bg-gray-50">
              {s}…
            </button>
          ))}
        </div>
        <textarea id={`${uid}-0`} rows={3} maxLength={max} value={value} onChange={(e) => onChange(e.target.value)} placeholder={p.placeholder} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <p className="text-xs text-gray-400 text-end mt-1">{value.length}/{max}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {prompts.map((p, i) => (
        <div key={p.label}>
          <label htmlFor={`${uid}-${i}`} className="block text-sm font-medium text-gray-800 mb-1.5">{p.label}</label>
          <div className="flex gap-1.5 flex-wrap mb-1.5">
            {p.starters.map((s) => (
              <button key={s} type="button" onClick={() => setAnswer(i, applyStarter(answers[i], s))} className="px-2.5 py-1 rounded-full border border-dashed border-gray-300 text-xs text-gray-600 hover:bg-gray-50">
                {s}…
              </button>
            ))}
          </div>
          <input id={`${uid}-${i}`} type="text" value={answers[i]} onChange={(e) => setAnswer(i, e.target.value)} placeholder={p.placeholder} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      ))}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-gray-800" htmlFor={`${uid}-box`}>{boxLabel}</label>
          {manual && answers.some((a) => a.trim()) && (
            <button type="button" onClick={() => { setManual(false); onChange(assembleAbout(answers, max)) }} className="text-xs text-blue-600 underline">
              {rebuildLabel}
            </button>
          )}
        </div>
        <textarea id={`${uid}-box`} rows={5} maxLength={max} value={value} onChange={(e) => { setManual(true); onChange(e.target.value) }} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <p className="text-xs text-gray-400 text-end mt-1">{value.length}/{max}</p>
      </div>
    </div>
  )
}
