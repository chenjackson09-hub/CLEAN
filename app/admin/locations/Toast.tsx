'use client'
import { useLanguage } from '@/lib/i18n/LanguageContext'

export type ToastState = { message: string; batch?: string; error?: boolean } | null

// One-line feedback after a change, with an Undo link while the change is fresh.
export function Toast({ toast, busy, onUndo, onDismiss }: {
  toast: ToastState
  busy: boolean
  onUndo: (batch: string) => void
  onDismiss: () => void
}) {
  const { t } = useLanguage()
  if (!toast) return null
  return (
    <div
      role="status"
      className={`mb-4 rounded-xl px-4 py-3 text-sm flex flex-wrap items-center gap-3 ${toast.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}
    >
      <span>{toast.message}</span>
      {toast.batch && (
        <button type="button" disabled={busy} onClick={() => onUndo(toast.batch!)} className="font-semibold underline">
          {t('admin.locations.undo')}
        </button>
      )}
      <button type="button" onClick={onDismiss} className="ms-auto text-xs opacity-70" aria-label={t('admin.locations.dismiss')}>✕</button>
    </div>
  )
}

export function ConfirmDialog({ title, body, busy, onConfirm, onCancel }: {
  title: string
  body: string
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <p className="font-semibold text-gray-900 mb-2">{title}</p>
        <p className="text-sm text-gray-600 mb-5">{body}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="bg-white hover:bg-[#F7F4EA] text-gray-700 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition">
            {t('admin.locations.cancel')}
          </button>
          <button type="button" disabled={busy} onClick={onConfirm} className="bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition disabled:opacity-60">
            {t('admin.locations.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
