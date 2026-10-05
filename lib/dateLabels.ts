import { weekdayOf } from '@/lib/dateMath'

export type LabelLang = 'en' | 'he'

// Fixed word lists (not toLocaleDateString) so server and client always render
// exactly the same short date text.
export const WEEKDAYS_SHORT: Record<LabelLang, string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  he: ['יום א׳', 'יום ב׳', 'יום ג׳', 'יום ד׳', 'יום ה׳', 'יום ו׳', 'שבת'],
}
export const MONTHS_SHORT: Record<LabelLang, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  he: ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'],
}

// "Thu 15 Oct" from a YYYY-MM-DD date.
export function shortDateLabel(dateStr: string, lang: LabelLang): string {
  const [, m, d] = dateStr.split('-').map(Number)
  return `${WEEKDAYS_SHORT[lang][weekdayOf(dateStr)]} ${d} ${MONTHS_SHORT[lang][m - 1]}`
}
