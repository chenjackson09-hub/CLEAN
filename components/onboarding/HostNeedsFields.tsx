"use client"

import { useEffect, useId, useRef } from "react"
import { Chip, OptionCard, Stepper } from "./Choice"
import { DAYS, FLEXIBILITY, HOME_VIBES, HOUSEHOLD_TYPES, NOTE_MAX, type HostNeeds } from "@/lib/onboarding/hostProfile"
import { CLEANING_TYPES, FREQUENCIES, PRIORITIES } from "@/lib/onboarding/options"
import { buildHostIntro, INTRO_MAX, type HostIntroInput } from "@/lib/onboarding/hostIntro"
import { hostStrings, type HostLang } from "@/lib/onboarding/hostProfileStrings"

type Common = { value: HostNeeds; onChange: (patch: Partial<HostNeeds>) => void; lang: HostLang }

const LABEL = "block text-sm font-medium text-gray-800 mb-1.5"
const INPUT = "w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

function toggle<T extends string>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
}

// "Who lives in your home?" — a household type plus an optional line.
export function HouseholdFields({ value, onChange, lang }: Common) {
  const s = hostStrings(lang)
  const id = useId()
  return (
    <div className="space-y-4">
      <div>
        <span className={LABEL}>{s.qHousehold}</span>
        <div className="flex gap-1.5 flex-wrap">
          {HOUSEHOLD_TYPES.map((h) => (
            <Chip key={h} selected={value.householdType === h} onClick={() => onChange({ householdType: value.householdType === h ? null : h })}>{s.householdType[h]}</Chip>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-hn`} className={LABEL}>{s.qHouseholdNote}</label>
        <input id={`${id}-hn`} type="text" maxLength={NOTE_MAX} value={value.householdNote} onChange={(e) => onChange({ householdNote: e.target.value })} placeholder={s.phHouseholdNote} className={INPUT} />
      </div>
    </div>
  )
}

// "What is your home generally like?" — tap words plus an optional line.
export function HomeVibeFields({ value, onChange, lang }: Common) {
  const s = hostStrings(lang)
  const id = useId()
  return (
    <div className="space-y-4">
      <div>
        <span className={LABEL}>{s.qHomeVibe}</span>
        <div className="flex gap-1.5 flex-wrap">
          {HOME_VIBES.map((v) => (
            <Chip key={v} selected={value.homeVibe.includes(v)} onClick={() => onChange({ homeVibe: toggle(value.homeVibe, v) })}>{s.homeVibe[v]}</Chip>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-hm`} className={LABEL}>{s.qHomeNote}</label>
        <input id={`${id}-hm`} type="text" maxLength={NOTE_MAX} value={value.homeNote} onChange={(e) => onChange({ homeNote: e.target.value })} placeholder={s.phHomeNote} className={INPUT} />
      </div>
    </div>
  )
}

// Everything about the usual cleaning needs.
export function NeedsFields({ value, onChange, lang }: Common) {
  const s = hostStrings(lang)
  const id = useId()
  return (
    <div className="space-y-6">
      <div>
        <span className={LABEL}>{s.qFrequency}</span>
        <div className="flex gap-1.5 flex-wrap">
          {FREQUENCIES.map((f) => (
            <Chip key={f} selected={value.frequency === f} onClick={() => onChange({ frequency: value.frequency === f ? null : f })}>{s.frequency[f]}</Chip>
          ))}
        </div>
      </div>

      <div>
        <span className={LABEL}>{s.qType}</span>
        <div className="flex gap-1.5 flex-wrap">
          {CLEANING_TYPES.map((c) => (
            <Chip key={c} selected={value.cleaningType === c} onClick={() => onChange({ cleaningType: value.cleaningType === c ? null : c })}>{s.cleaningType[c]}</Chip>
          ))}
        </div>
      </div>

      <div>
        <span className={LABEL}>{s.qTasks}</span>
        <div className="flex gap-1.5 flex-wrap">
          {PRIORITIES.map((p) => (
            <Chip key={p} selected={value.priorities.includes(p)} onClick={() => onChange({ priorities: toggle(value.priorities, p) })}>{s.tasks[p]}</Chip>
          ))}
        </div>
        {value.priorities.includes("other") && (
          <input type="text" maxLength={NOTE_MAX} value={value.priorityOtherText} onChange={(e) => onChange({ priorityOtherText: e.target.value })} placeholder={s.phTaskOther} aria-label={s.tasks.other} className={`${INPUT} mt-2`} />
        )}
      </div>

      <div>
        <span className={LABEL}>{s.qHours}</span>
        <div className="flex items-center gap-3">
          <Stepper value={value.typicalHours} onChange={(v) => onChange({ typicalHours: v })} min={1} max={12} step={0.5} label={s.qHours} suffix={s.hoursUnit} />
          {value.typicalHours !== "" && (
            <button type="button" onClick={() => onChange({ typicalHours: "" })} className="text-xs text-gray-500 underline">×</button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1.5">{s.hoursHint}</p>
      </div>

      <div>
        <span className={LABEL}>{s.qDays}</span>
        <div className="flex gap-1.5 flex-wrap">
          {DAYS.map((d) => (
            <Chip key={d} selected={value.preferredDays.includes(d)} onClick={() => onChange({ preferredDays: toggle(value.preferredDays, d) })}>{s.days[d]}</Chip>
          ))}
          <Chip selected={value.daysFlexible} onClick={() => onChange({ daysFlexible: !value.daysFlexible })}>{s.daysFlexible}</Chip>
        </div>
      </div>

      <div>
        <span className={LABEL}>{s.qFlexibility}</span>
        <div className="grid grid-cols-3 gap-2">
          {FLEXIBILITY.map((f) => (
            <OptionCard key={f} selected={value.flexibility === f} onClick={() => onChange({ flexibility: value.flexibility === f ? null : f })} title={s.flexibility[f]} />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-x`} className={LABEL}>{s.qExtra}</label>
        <textarea id={`${id}-x`} rows={3} maxLength={NOTE_MAX * 2} value={value.extraNote} onChange={(e) => onChange({ extraNote: e.target.value })} placeholder={s.phExtra} className={`${INPUT} resize-none`} />
        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-1.5">{s.extraHint}</p>
      </div>
    </div>
  )
}

// The generated "About us" paragraph: written from the answers, then fully editable. Nothing is
// saved by pressing "Write it for me" — the host reads it, edits it and saves it like any other field.
export function HostIntroEditor({
  value, onChange, input, lang, autoFill = false, name, rows = 7,
}: {
  value: string
  onChange: (v: string) => void
  input: HostIntroInput
  lang: HostLang
  autoFill?: boolean
  name?: string
  rows?: number
}) {
  const s = hostStrings(lang)
  const id = useId()
  const lastGenerated = useRef<string | null>(null)
  const generated = buildHostIntro(input, lang)

  // First time the screen opens with an empty box: fill it from the answers (once).
  useEffect(() => {
    if (autoFill && value.trim() === "" && generated) {
      lastGenerated.current = generated
      onChange(generated)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function generate() {
    if (!generated) return
    // Never silently throw away words the host wrote or changed.
    if (value.trim() !== "" && value !== lastGenerated.current && !window.confirm(s.replaceConfirm)) return
    lastGenerated.current = generated
    onChange(generated)
  }

  return (
    <div>
      <label htmlFor={`${id}-box`} className={LABEL}>{s.boxLabel}</label>
      <textarea id={`${id}-box`} name={name} rows={rows} maxLength={INTRO_MAX} value={value} onChange={(e) => onChange(e.target.value)} className={`${INPUT} resize-none leading-relaxed`} />
      <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
        <span>{generated && value === lastGenerated.current ? s.generatedNote : ""}</span>
        <span>{value.length}/{INTRO_MAX}</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap mt-3">
        <button type="button" onClick={generate} disabled={!generated} className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50">
          {value.trim() === "" ? s.generate : s.regenerate}
        </button>
        {!generated && value.trim() === "" && <span className="text-xs text-gray-500">{s.storyEmpty}</span>}
      </div>
      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 mt-3">{s.storyPrivacy}</p>
    </div>
  )
}
