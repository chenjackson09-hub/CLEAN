// The "Cindy Verified" mark. It means ONE thing: a person on the Cindy team checked this
// person and verified them by hand. It is never shown for "approved" or "profile complete".
// i18n-agnostic (a plain `lang` prop) because it appears on both sides of the app.
const LABEL = { en: 'Cindy Verified', he: 'מאומת Cindy' } as const

export function CindyVerifiedBadge({ lang = 'en', size = 'md' }: { lang?: 'en' | 'he'; size?: 'sm' | 'md' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-blue-50 font-semibold text-blue-700 whitespace-nowrap ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
      title={LABEL[lang]}
    >
      <svg viewBox="0 0 20 20" className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 10-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" clipRule="evenodd" />
      </svg>
      {LABEL[lang]}
    </span>
  )
}
