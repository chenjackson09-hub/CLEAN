import type { HostNeeds } from './hostProfile'

// The "About us" paragraph is WRITTEN FROM THE HOST'S ANSWERS by fixed sentence templates (no AI, no
// outside service, no cost). Every sentence appears only if its answers exist, so nothing is ever
// invented. Anything a host typed freely is added as its own sentence, exactly as written.
//
// Hebrew is phrased to work for any gender (plural "we", "נשמח/אשמח", noun phrases) so no verb has
// to be guessed for one person.

export type HostIntroInput = HostNeeds & {
  homeType: string | null
  numFloors: string
  numPeople: string
  petTypes: string[]
  numPets: string
}

export const INTRO_MAX = 800

const intOrNull = (s: string): number | null => {
  if (!s.trim()) return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

const ensureEnd = (t: string): string => {
  const s = t.trim()
  if (!s) return ''
  return /[.!?…]$/.test(s) ? s : `${s}.`
}

const NUM_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const numEn = (n: number) => (n >= 0 && n <= 10 ? NUM_EN[n] : String(n))
const joinEn = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)
const joinHe = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ו${items[items.length - 1]}`)
const article = (phrase: string) => (/^[aeiou]/i.test(phrase) ? 'an' : 'a')

function isAlone(i: HostIntroInput, people: number | null): boolean {
  return i.householdType === 'alone' || (!i.householdType && people === 1)
}

function buildEn(i: HostIntroInput): string[] {
  const people = intOrNull(i.numPeople)
  const floors = intOrNull(i.numFloors)
  const pets = intOrNull(i.numPets)
  const alone = isAlone(i, people)
  const We = alone ? 'I' : 'We'
  const Were = alone ? "I'm" : "We're"
  const Wed = alone ? "I'd" : "We'd"
  const us = alone ? 'me' : 'us'
  const Our = alone ? 'My' : 'Our'
  const out: string[] = []

  // Household
  const n = people && people >= 2 ? numEn(people) : null
  switch (i.householdType) {
    case 'alone': out.push('I live on my own.'); break
    case 'couple': out.push("We're a couple."); break
    case 'family': out.push(n ? `We're a family of ${n}.` : "We're a family."); break
    case 'family_kids': out.push(n ? `We're a family of ${n} with kids.` : "We're a family with kids."); break
    case 'roommates': out.push(n ? `We're ${n} roommates sharing a home.` : "We're roommates sharing a home."); break
    default: if (n) out.push(`There are ${n} of us at home.`)
  }
  if (i.householdNote.trim()) out.push(ensureEnd(i.householdNote))

  // Pets
  const kinds = (['dog', 'cat', 'other'] as const).filter((k) => i.petTypes.includes(k))
  if (kinds.length === 1) {
    const k = kinds[0]
    const one = k === 'dog' ? 'a dog' : k === 'cat' ? 'a cat' : 'a pet'
    const many = k === 'dog' ? 'dogs' : k === 'cat' ? 'cats' : 'pets'
    out.push(pets && pets >= 2 ? `${We} have ${numEn(pets)} ${many}.` : `${We} have ${one}.`)
  } else if (kinds.length > 1) {
    const plural = kinds.map((k) => (k === 'dog' ? 'dogs' : k === 'cat' ? 'cats' : 'other pets'))
    const single = kinds.map((k) => (k === 'dog' ? 'a dog' : k === 'cat' ? 'a cat' : 'another pet'))
    out.push(pets && pets >= 2 ? `${We} have ${numEn(pets)} pets (${joinEn(plural)}).` : `${We} have ${joinEn(single)}.`)
  }

  // Home
  const adjs = i.homeVibe.map((v) => ({ small: 'small', large: 'large', renovated: 'newly renovated', older: 'older' })[v])
  const hasFloors = floors != null && floors >= 2
  const noun = ({ apartment: 'apartment', house: 'house', villa: 'villa', guesthouse: 'guesthouse', office: 'office' } as Record<string, string>)[i.homeType ?? ''] ?? 'home'
  if (i.homeType) {
    const storyAdj = hasFloors && ['house', 'villa', 'other'].includes(i.homeType) ? `${numEn(floors!)}-story` : ''
    const suffix = hasFloors && !storyAdj ? ` over ${numEn(floors!)} floors` : ''
    const phrase = [...(adjs.length ? [adjs.join(', ')] : []), ...(storyAdj ? [storyAdj] : []), noun].join(' ') + suffix
    out.push(i.homeType === 'office' ? `${Our} space is ${article(phrase)} ${phrase}.` : `${We} live in ${article(phrase)} ${phrase}.`)
  } else if (adjs.length) {
    out.push(`${Our} home is ${joinEn(adjs)}${hasFloors ? `, with ${numEn(floors!)} floors` : ''}.`)
  } else if (hasFloors) {
    out.push(`${Our} home has ${numEn(floors!)} floors.`)
  }
  if (i.homeNote.trim()) out.push(ensureEnd(i.homeNote))

  // What they need, and how often
  const freq = ({ weekly: 'once a week', twice_monthly: 'twice a month', monthly: 'once a month', occasional: 'every now and then' } as Record<string, string>)[i.frequency ?? '']
  const type = ({ regular: 'regular cleaning', deep: 'deep cleaning', both: 'a mix of regular and deep cleaning' } as Record<string, string>)[i.cleaningType ?? '']
  if (i.frequency === 'one_time') {
    out.push(`${Were} looking for a one-time clean.`)
    if (type) out.push(`${We} need ${type}.`)
  } else if (freq && type) out.push(`${Wed} love help ${freq} with ${type}.`)
  else if (freq) out.push(`${Wed} love help ${freq}.`)
  else if (type) out.push(`${Were} looking for ${type}.`)

  const taskText: Record<string, string> = {
    kitchen: 'the kitchen', bathrooms: 'the bathrooms', floors: 'the floors', dusting: 'dusting', windows: 'the windows',
    linens: 'changing bed sheets', laundry: 'laundry', dishes: 'the dishes', outdoor: 'the outdoor areas',
  }
  const tasks = i.priorities
    .map((p) => (p === 'other' ? i.priorityOtherText.trim() : taskText[p]))
    .filter((t): t is string => !!t)
  // "the kitchen, bathrooms and floors": the article is only needed once.
  const tasksEn = tasks.map((t, idx) => (idx > 0 && t.startsWith('the ') ? t.slice(4) : t))
  if (tasksEn.length) out.push(`${We} usually need help with ${joinEn(tasksEn)}.`)

  const h = i.typicalHours ? Number(i.typicalHours) : null
  if (h != null && Number.isFinite(h) && h > 0) out.push(`A typical visit takes about ${h === 1 ? '1 hour' : `${h} hours`}.`)

  const dayNames = i.preferredDays.map((d) => ({ sun: 'Sundays', mon: 'Mondays', tue: 'Tuesdays', wed: 'Wednesdays', thu: 'Thursdays', fri: 'Fridays', sat: 'Saturdays' })[d])
  const flexAny = i.flexibility === 'somewhat' || i.flexibility === 'very'
  if (dayNames.length) out.push(i.daysFlexible ? `${joinEn(dayNames)} work best for ${us}, but other days are fine too.` : `${joinEn(dayNames)} work best for ${us}.`)
  else if (i.daysFlexible && !flexAny) out.push(`${Were} flexible about the days.`)

  if (i.flexibility === 'fixed') out.push(`Timing and the amount of work are fairly fixed for ${us}.`)
  else if (i.flexibility === 'somewhat') out.push(`${Were} somewhat flexible about timing and the amount of work.`)
  else if (i.flexibility === 'very') out.push(`${Were} very flexible about timing and the amount of work.`)

  if (i.extraNote.trim()) out.push(ensureEnd(i.extraNote))
  if (out.length) out.push('Looking forward to finding a great match!')
  return out
}

function buildHe(i: HostIntroInput): string[] {
  const people = intOrNull(i.numPeople)
  const floors = intOrNull(i.numFloors)
  const pets = intOrNull(i.numPets)
  const alone = isAlone(i, people)
  const lanu = alone ? 'לי' : 'לנו'
  const shelanu = alone ? 'שלי' : 'שלנו'
  const out: string[] = []

  const np = people && people >= 2 ? people : null
  switch (i.householdType) {
    case 'alone': out.push('אני לבד בבית.'); break
    case 'couple': out.push('אנחנו זוג.'); break
    case 'family': out.push(np ? `אנחנו משפחה בת ${np} נפשות.` : 'אנחנו משפחה.'); break
    case 'family_kids': out.push(np ? `אנחנו משפחה עם ילדים בת ${np} נפשות.` : 'אנחנו משפחה עם ילדים.'); break
    case 'roommates': out.push(np ? `אנחנו ${np} שותפים לדירה.` : 'אנחנו שותפים לדירה.'); break
    default: if (np) out.push(`אנחנו ${np} נפשות בבית.`)
  }
  if (i.householdNote.trim()) out.push(ensureEnd(i.householdNote))

  const kinds = (['dog', 'cat', 'other'] as const).filter((k) => i.petTypes.includes(k))
  if (kinds.length === 1) {
    const k = kinds[0]
    const one = k === 'dog' ? 'כלב' : k === 'cat' ? 'חתול' : 'חיית מחמד'
    const many = k === 'dog' ? 'כלבים' : k === 'cat' ? 'חתולים' : 'חיות מחמד'
    out.push(pets && pets >= 2 ? `יש ${lanu} ${pets} ${many}.` : `יש ${lanu} ${one}.`)
  } else if (kinds.length > 1) {
    const plural = kinds.map((k) => (k === 'dog' ? 'כלבים' : k === 'cat' ? 'חתולים' : 'חיות אחרות'))
    const single = kinds.map((k) => (k === 'dog' ? 'כלב' : k === 'cat' ? 'חתול' : 'חיית מחמד נוספת'))
    out.push(pets && pets >= 2 ? `יש ${lanu} ${pets} חיות מחמד (${joinHe(plural)}).` : `יש ${lanu} ${joinHe(single)}.`)
  }

  const nouns: Record<string, { n: string; fem: boolean }> = {
    house: { n: 'בית', fem: false }, apartment: { n: 'דירה', fem: true }, villa: { n: 'וילה', fem: true },
    guesthouse: { n: 'יחידת אירוח', fem: true }, office: { n: 'משרד', fem: false },
  }
  const hasFloors = floors != null && floors >= 2
  const floorsHe = floors === 2 ? 'שתי קומות' : `${floors} קומות`
  const adjHe = (fem: boolean) => i.homeVibe.map((v) => ({ small: fem ? 'קטנה' : 'קטן', large: fem ? 'גדולה' : 'גדול', renovated: fem ? 'משופצת' : 'משופץ', older: fem ? 'ישנה' : 'ישן' })[v])
  if (i.homeType) {
    const { n, fem } = nouns[i.homeType] ?? { n: 'בית', fem: false }
    const adjs = adjHe(fem)
    const parts = [n, ...(adjs.length ? [joinHe(adjs)] : []), ...(hasFloors ? [`${fem ? 'בת' : 'בן'} ${floorsHe}`] : [])]
    out.push(`יש ${lanu} ${parts.join(' ')}.`)
  } else if (i.homeVibe.length) {
    out.push(`הבית ${shelanu} ${joinHe(adjHe(false))}${hasFloors ? `, בן ${floorsHe}` : ''}.`)
  } else if (hasFloors) {
    out.push(`בבית ${shelanu} יש ${floorsHe}.`)
  }
  if (i.homeNote.trim()) out.push(ensureEnd(i.homeNote))

  const would = alone ? 'אשמח' : 'נשמח'
  const freq = ({ weekly: 'פעם בשבוע', twice_monthly: 'פעמיים בחודש', monthly: 'פעם בחודש', occasional: 'מדי פעם' } as Record<string, string>)[i.frequency ?? '']
  const typeNoun = ({ regular: 'ניקיון רגיל', deep: 'ניקיון יסודי', both: 'שילוב של ניקיון רגיל וניקיון יסודי' } as Record<string, string>)[i.cleaningType ?? '']
  const typeFor = ({ regular: 'לניקיון רגיל', deep: 'לניקיון יסודי', both: 'לשילוב של ניקיון רגיל וניקיון יסודי' } as Record<string, string>)[i.cleaningType ?? '']
  if (i.frequency === 'one_time') {
    out.push(`${would} לניקיון חד-פעמי.`)
    if (typeNoun) out.push(`נדרש ${typeNoun}.`)
  } else if (freq && typeNoun) out.push(`${would} לעזרה ${freq} עם ${typeNoun}.`)
  else if (freq) out.push(`${would} לעזרה ${freq}.`)
  else if (typeFor) out.push(`${would} ${typeFor}.`)

  const taskText: Record<string, string> = {
    kitchen: 'המטבח', bathrooms: 'חדרי האמבטיה', floors: 'הרצפות', dusting: 'ניקוי אבק', windows: 'החלונות',
    linens: 'החלפת מצעים', laundry: 'כביסה', dishes: 'כלים', outdoor: 'השטח החיצוני',
  }
  const tasks = i.priorities.map((p) => (p === 'other' ? i.priorityOtherText.trim() : taskText[p])).filter((t): t is string => !!t)
  if (tasks.length) out.push(`המשימות העיקריות: ${joinHe(tasks)}.`)

  const h = i.typicalHours ? Number(i.typicalHours) : null
  if (h != null && Number.isFinite(h) && h > 0) out.push(`כל ביקור אורך בערך ${h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : `${h} שעות`}.`)

  const dayHe: Record<string, string> = { sun: 'ראשון', mon: 'שני', tue: 'שלישי', wed: 'רביעי', thu: 'חמישי', fri: 'שישי', sat: 'שבת' }
  const weekdays = i.preferredDays.filter((d) => d !== 'sat').map((d) => dayHe[d])
  const hasSat = i.preferredDays.includes('sat')
  const flexAny = i.flexibility === 'somewhat' || i.flexibility === 'very'
  if (i.preferredDays.length) {
    let who: string
    let verb: string
    if (i.preferredDays.length === 1) {
      who = hasSat ? 'שבת' : `יום ${weekdays[0]}`
      verb = hasSat ? 'מתאימה' : 'מתאים'
    } else {
      who = `ימי ${joinHe(weekdays)}${hasSat ? ' ושבת' : ''}`
      verb = 'מתאימים'
    }
    out.push(i.daysFlexible ? `${who} ${verb} ${lanu} במיוחד, אבל גם ימים אחרים בסדר.` : `${who} ${verb} ${lanu} במיוחד.`)
  } else if (i.daysFlexible && !flexAny) out.push('יש גמישות לגבי הימים.')

  if (i.flexibility === 'fixed') out.push('התזמון והיקף העבודה די קבועים.')
  else if (i.flexibility === 'somewhat') out.push('יש גמישות מסוימת לגבי התזמון והיקף העבודה.')
  else if (i.flexibility === 'very') out.push('יש גמישות רבה לגבי התזמון והיקף העבודה.')

  if (i.extraNote.trim()) out.push(ensureEnd(i.extraNote))
  if (out.length) out.push(`${would} למצוא התאמה מצוינת!`)
  return out
}

/** The paragraph for these answers, in the given language. '' when nothing was answered. */
export function buildHostIntro(input: HostIntroInput, lang: 'en' | 'he'): string {
  const text = (lang === 'he' ? buildHe(input) : buildEn(input)).join(' ')
  return text.length > INTRO_MAX ? text.slice(0, INTRO_MAX).trimEnd() : text
}
