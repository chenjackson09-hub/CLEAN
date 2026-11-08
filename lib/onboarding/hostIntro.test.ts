import { buildHostIntro, INTRO_MAX, type HostIntroInput } from './hostIntro'
import { EMPTY_HOST_NEEDS } from './hostProfile'

const base: HostIntroInput = { ...EMPTY_HOST_NEEDS, homeType: null, numFloors: '', numPeople: '', petTypes: [], numPets: '' }
const intro = (patch: Partial<HostIntroInput>, lang: 'en' | 'he' = 'en') => buildHostIntro({ ...base, ...patch }, lang)

describe('buildHostIntro', () => {
  it('writes nothing when nothing was answered', () => {
    expect(intro({})).toBe('')
    expect(intro({}, 'he')).toBe('')
  })

  it('writes the full example from the answers, in order', () => {
    const text = intro({
      householdType: 'family_kids', numPeople: '5', petTypes: ['dog'], numPets: '2',
      homeType: 'house', numFloors: '2', homeVibe: ['large', 'renovated'],
      frequency: 'weekly', cleaningType: 'regular', priorities: ['kitchen', 'bathrooms', 'floors'],
      typicalHours: '4', preferredDays: ['tue', 'thu'], flexibility: 'very',
    })
    expect(text).toBe(
      "We're a family of five with kids. We have two dogs. We live in a large, newly renovated two-story house. " +
      "We'd love help once a week with regular cleaning. We usually need help with the kitchen, bathrooms and floors. " +
      "A typical visit takes about 4 hours. Tuesdays and Thursdays work best for us. " +
      "We're very flexible about timing and the amount of work. Looking forward to finding a great match!",
    )
  })

  it('only mentions what was answered', () => {
    const text = intro({ frequency: 'monthly' })
    expect(text).toBe("We'd love help once a month. Looking forward to finding a great match!")
    for (const word of ['pets', 'dog', 'floors', 'hours', 'Tuesdays', 'flexible', 'family', 'kitchen']) expect(text).not.toContain(word)
  })

  it('uses I and my for someone who lives alone', () => {
    const text = intro({ householdType: 'alone', petTypes: ['cat'], homeType: 'apartment', frequency: 'twice_monthly', preferredDays: ['sun'] })
    expect(text).toContain('I live on my own.')
    expect(text).toContain('I have a cat.')
    expect(text).toContain('I live in an apartment.')
    expect(text).toContain("I'd love help twice a month.")
    expect(text).toContain('Sundays work best for me.')
    expect(text).not.toMatch(/\bwe\b|\bour\b|\bus\b/i)
  })

  it('treats a single person count as living alone', () => {
    expect(intro({ numPeople: '1', frequency: 'weekly' })).toContain("I'd love help once a week.")
  })

  it('adds free text as its own sentence, exactly as typed', () => {
    const text = intro({ householdNote: 'three kids and a grandparent', extraNote: 'Please bring your own shoes' })
    expect(text).toContain('three kids and a grandparent.')
    expect(text).toContain('Please bring your own shoes.')
  })

  it('handles apartments, offices, several pet kinds and a one-time clean', () => {
    expect(intro({ homeType: 'apartment', numFloors: '2' })).toContain('We live in an apartment over two floors.')
    expect(intro({ homeType: 'office' })).toContain('Our space is an office.')
    expect(intro({ petTypes: ['dog', 'cat'], numPets: '3' })).toContain('We have three pets (dogs and cats).')
    expect(intro({ frequency: 'one_time', cleaningType: 'deep' })).toContain("We're looking for a one-time clean. We need deep cleaning.")
  })

  it('flexible days without a flexibility level, and with one', () => {
    expect(intro({ daysFlexible: true })).toContain("We're flexible about the days.")
    const both = intro({ daysFlexible: true, flexibility: 'somewhat' })
    expect(both).not.toContain('about the days')
    expect(intro({ preferredDays: ['mon'], daysFlexible: true })).toContain('Mondays work best for us, but other days are fine too.')
  })

  it('never goes past the length limit', () => {
    expect(intro({ extraNote: 'x'.repeat(5000) }).length).toBeLessThanOrEqual(INTRO_MAX)
  })

  describe('Hebrew', () => {
    it('writes the example without gendered verbs', () => {
      const text = intro({
        householdType: 'family_kids', numPeople: '5', petTypes: ['dog'], numPets: '2',
        homeType: 'house', numFloors: '2', homeVibe: ['large', 'renovated'],
        frequency: 'weekly', cleaningType: 'regular', priorities: ['kitchen', 'bathrooms', 'floors'],
        typicalHours: '4', preferredDays: ['tue', 'thu'], flexibility: 'very',
      }, 'he')
      expect(text).toBe(
        'אנחנו משפחה עם ילדים בת 5 נפשות. יש לנו 2 כלבים. יש לנו בית גדול ומשופץ בן שתי קומות. ' +
        'נשמח לעזרה פעם בשבוע עם ניקיון רגיל. המשימות העיקריות: המטבח, חדרי האמבטיה והרצפות. ' +
        'כל ביקור אורך בערך 4 שעות. ימי שלישי וחמישי מתאימים לנו במיוחד. ' +
        'יש גמישות רבה לגבי התזמון והיקף העבודה. נשמח למצוא התאמה מצוינת!',
      )
    })

    it('uses the singular for someone living alone and agrees feminine nouns', () => {
      const text = intro({ householdType: 'alone', homeType: 'apartment', homeVibe: ['small'], numFloors: '2', preferredDays: ['sat'], frequency: 'occasional' }, 'he')
      expect(text).toContain('אני לבד בבית.')
      expect(text).toContain('יש לי דירה קטנה בת שתי קומות.')
      expect(text).toContain('אשמח לעזרה מדי פעם.')
      expect(text).toContain('שבת מתאימה לי במיוחד.')
    })

    it('handles several days including Saturday and a single weekday', () => {
      expect(intro({ preferredDays: ['sun', 'sat'] }, 'he')).toContain('ימי ראשון ושבת מתאימים לנו במיוחד.')
      expect(intro({ preferredDays: ['wed'] }, 'he')).toContain('יום רביעי מתאים לנו במיוחד.')
    })
  })
})
