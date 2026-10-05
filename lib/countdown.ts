// "in 3 days" / "next week" / "in two weeks" — a short, human countdown to a
// clean for the home screens. Pure (takes whole days from today), so it can't
// hydrate-mismatch.
export function countdownLabel(days: number, lang: 'en' | 'he'): string {
  const he = lang === 'he'
  if (days <= 0) return he ? 'היום' : 'today'
  if (days === 1) return he ? 'מחר' : 'tomorrow'
  if (days < 7) return he ? `בעוד ${days} ימים` : `in ${days} days`
  if (days < 14) return he ? 'בשבוע הבא' : 'next week'
  if (days < 21) return he ? 'בעוד שבועיים' : 'in two weeks'
  if (days < 28) return he ? 'בעוד 3 שבועות' : 'in three weeks'
  if (days < 45) return he ? 'בעוד חודש' : 'in a month'
  const months = Math.round(days / 30)
  return he ? `בעוד ${months} חודשים` : `in ${months} months`
}
