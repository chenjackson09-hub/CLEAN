'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { CANCEL_REASONS, CANCEL_REASON_LABELS, MAX_CANCEL_MESSAGE, type CancelReason } from '@/lib/cancellation'

type Lang = 'en' | 'he'
export type CancelOutcome = { error?: string; alreadyCancelled?: boolean; success?: boolean }

// i18n-system-agnostic (takes a plain `lang`), like BookingRequestSummary, because
// it is used by both the host's and the cleaner's booking modals.
const STRINGS = {
  en: {
    title: 'Cancel this cleaning?',
    hours: 'about {n} h',
    rate: '₪{n}/hour',
    with: 'With {name}',
    why: 'Why are you cancelling?',
    messageLabel: 'Add a short message to {name} (optional)',
    messagePlaceholder: 'Anything you’d like them to know…',
    keep: 'Keep booking',
    next: 'Continue',
    back: 'Back',
    confirm: 'Cancel cleaning',
    cancelling: 'Cancelling…',
    finalTitle: 'Cancel this cleaning?',
    hostConsequence: '{name} will be notified that the cleaning was cancelled. Their time will become available again.',
    cleanerConsequence: '{name} will be notified that you cancelled this cleaning. Cindy will help them find another cleaner.',
    doneTitle: 'Cleaning cancelled',
    doneBody: '{name} has been notified.',
    alreadyTitle: 'Already cancelled',
    alreadyBody: 'This cleaning was already cancelled.',
    done: 'Done',
    failed: 'Could not cancel. Please try again.',
  },
  he: {
    title: 'לבטל את הניקיון?',
    hours: 'כ-{n} שע׳',
    rate: '₪{n}/שעה',
    with: 'עם {name}',
    why: 'למה מבטלים?',
    messageLabel: 'אפשר להוסיף הודעה קצרה ל{name} (לא חובה)',
    messagePlaceholder: 'משהו שתרצו שיידעו…',
    keep: 'להשאיר את ההזמנה',
    next: 'המשך',
    back: 'חזרה',
    confirm: 'ביטול הניקיון',
    cancelling: 'מבטל…',
    finalTitle: 'לבטל את הניקיון?',
    hostConsequence: '{name} יקבל/תקבל הודעה שהניקיון בוטל. הזמן שלהם ייפתח מחדש.',
    cleanerConsequence: '{name} יקבל/תקבל הודעה שביטלת את הניקיון. Cindy תעזור למצוא מנקה אחר/ת.',
    doneTitle: 'הניקיון בוטל',
    doneBody: '{name} קיבל/ה הודעה.',
    alreadyTitle: 'כבר בוטל',
    alreadyBody: 'הניקיון הזה כבר בוטל.',
    done: 'סיום',
    failed: 'לא ניתן היה לבטל. נסו שוב.',
  },
} as const

function longDate(date: string, lang: Lang): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function CancelCleaningSheet({
  lang,
  role,
  date,
  start,
  durationHours,
  hourlyRate,
  otherName,
  onConfirm,
  onClose,
  onDone,
}: {
  lang: Lang
  role: 'host' | 'cleaner'
  date: string // YYYY-MM-DD
  start: string // HH:MM[:SS]
  durationHours: number
  hourlyRate?: number | null
  otherName: string // first name for the host's view of a cleaner, as shown elsewhere
  onConfirm: (input: { reason: string | null; message: string | null }) => Promise<CancelOutcome>
  onClose: () => void // dismissed without cancelling
  onDone: () => void // finished (cancelled, or found already cancelled)
}) {
  const s = STRINGS[lang]
  const [step, setStep] = useState<'reason' | 'confirm' | 'done' | 'already'>('reason')
  const [reason, setReason] = useState<CancelReason | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const first = otherName.trim().split(/\s+/)[0] || otherName

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await onConfirm({ reason, message: message.trim() || null })
      if (res.alreadyCancelled) return setStep('already')
      if (res.error) return setError(s.failed)
      setStep('done')
    })
  }

  const summary = (
    <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
      <p className="font-semibold text-gray-900">
        {longDate(date, lang)} · {start.slice(0, 5)}
      </p>
      <p className="mt-0.5">
        {s.hours.replace('{n}', String(durationHours))}
        {hourlyRate != null ? ` · ${s.rate.replace('{n}', String(hourlyRate))}` : ''}
      </p>
      <p className="mt-0.5">{s.with.replace('{name}', otherName)}</p>
    </div>
  )

  const primary = 'flex-1 rounded-xl py-3.5 text-base font-semibold transition-colors disabled:opacity-60'

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={step === 'reason' || step === 'confirm' ? onClose : undefined}>
      <div
        role="dialog"
        aria-label={s.title}
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'reason' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">{s.title}</h2>
            {summary}
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-gray-900">{s.why}</legend>
              <div className="space-y-1.5">
                {CANCEL_REASONS.map((key) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                      reason === key ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input type="radio" name="cancel-reason" checked={reason === key} onChange={() => setReason(key)} className="accent-gray-900" />
                    {CANCEL_REASON_LABELS[lang][key][role]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm text-gray-700">
              {s.messageLabel.replace('{name}', first)}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={MAX_CANCEL_MESSAGE}
                rows={3}
                placeholder={s.messagePlaceholder}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
              />
            </label>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className={`${primary} bg-gray-100 text-gray-800 hover:bg-gray-200`}>
                {s.keep}
              </button>
              <button type="button" onClick={() => setStep('confirm')} className={`${primary} bg-gray-900 text-white hover:bg-gray-700`}>
                {s.next}
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900">{s.finalTitle}</h2>
            {summary}
            <p className="text-sm text-gray-700">
              {(role === 'host' ? s.hostConsequence : s.cleanerConsequence).replace('{name}', first)}
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={onClose} disabled={pending} className={`${primary} bg-gray-100 text-gray-800 hover:bg-gray-200`}>
                {s.keep}
              </button>
              <button type="button" onClick={submit} disabled={pending} className={`${primary} bg-red-600 text-white hover:bg-red-700`}>
                {pending ? s.cancelling : s.confirm}
              </button>
            </div>
            <button type="button" onClick={() => setStep('reason')} disabled={pending} className="block w-full text-center text-sm text-gray-500 hover:text-gray-800">
              {s.back}
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-bold text-gray-900">{s.doneTitle}</h2>
            <p className="text-sm text-gray-600">{s.doneBody.replace('{name}', first)}</p>
            <button type="button" onClick={onDone} className={`${primary} w-full bg-gray-900 text-white hover:bg-gray-700`}>
              {s.done}
            </button>
          </div>
        )}

        {step === 'already' && (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-bold text-gray-900">{s.alreadyTitle}</h2>
            <p className="text-sm text-gray-600">{s.alreadyBody}</p>
            <button type="button" onClick={onDone} className={`${primary} w-full bg-gray-900 text-white hover:bg-gray-700`}>
              {s.done}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
