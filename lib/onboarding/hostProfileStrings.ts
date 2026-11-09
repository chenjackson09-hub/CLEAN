// Words for the household / cleaning-needs questions and the "About us" paragraph. Used by the host
// wizard AND the host's profile editor, which live under two different language systems — so this
// takes a plain 'en' | 'he' and keeps its own copy of the text (same approach as HelpWidget).

export type HostLang = 'en' | 'he'

const en = {
  householdTitle: 'Your household',
  householdSub: 'A few quick questions help cleaners picture who they would be working for. Everything is optional.',
  qHousehold: 'Who lives in your home?',
  householdType: { alone: 'Living alone', couple: 'A couple', family: 'A family', family_kids: 'A family with kids', roommates: 'Roommates', other: 'Something else' },
  qHouseholdNote: 'Anything to add about who lives there?',
  phHouseholdNote: 'e.g. three kids and a grandparent',
  qHomeVibe: 'What is your home generally like?',
  homeVibe: { small: 'Small', large: 'Large', renovated: 'Newly renovated', older: 'Older' },
  qHomeNote: 'Anything else about the home?',
  phHomeNote: 'e.g. lots of glass and wooden floors',
  petsTitle: 'Pets',

  needsTitle: 'Your cleaning needs',
  needsSub: 'What you usually need. Each request you send can still be different.',
  qFrequency: 'How often do you usually need help?',
  frequency: { weekly: 'Weekly', twice_monthly: 'Twice a month', monthly: 'Monthly', occasional: 'Occasionally', one_time: 'Just once', other: 'Other' },
  qType: 'What type of cleaning do you usually need?',
  cleaningType: { regular: 'Regular cleaning', deep: 'Deep cleaning', both: 'Both' },
  qTasks: 'What do you usually want help with?',
  tasks: { kitchen: 'Kitchen', bathrooms: 'Bathrooms', floors: 'Floors', dusting: 'Dusting', windows: 'Windows', linens: 'Changing bed sheets', laundry: 'Laundry', dishes: 'Dishes', outdoor: 'Outdoor', other: 'Other' },
  phTaskOther: 'What else?',
  qHours: 'About how long does a typical visit take?',
  hoursUnit: 'h',
  hoursHint: 'A rough estimate is fine.',
  qDays: 'Which days usually work for you?',
  days: { sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat' },
  daysFlexible: 'Flexible',
  qFlexibility: 'How flexible are you about timing and the amount of work?',
  flexibility: { fixed: 'Fairly fixed', somewhat: 'Somewhat flexible', very: 'Very flexible' },
  qExtra: 'Anything else you would like a cleaner to know?',
  phExtra: 'e.g. If you could send us a list of what you need, so we can check if we have it before you arrive, that would be great',
  extraHint: 'Cleaners you send a request to can read this. Please keep door codes and entry details out of it.',

  storyTitle: 'About us',
  storySub: 'We wrote this from your answers. Change anything you like.',
  storyEmpty: 'Answer a few of the questions first, or write your own.',
  generate: 'Write it for me',
  regenerate: 'Write it again',
  generatedNote: 'Built only from what you answered',
  replaceConfirm: 'Replace what you wrote with a new version?',
  storyPrivacy: 'Cleaners you send a request to can read this. Keep door codes out of it.',
  boxLabel: 'Your introduction',

  previewAbout: 'About us',
  previewNeeds: 'Cleaning needs',
}

const he: typeof en = {
  householdTitle: 'משק הבית שלכם',
  householdSub: 'כמה שאלות קצרות עוזרות למנקים לדמיין עבור מי הם יעבדו. הכול אופציונלי.',
  qHousehold: 'מי גר בבית?',
  householdType: { alone: 'גר/ה לבד', couple: 'זוג', family: 'משפחה', family_kids: 'משפחה עם ילדים', roommates: 'שותפים', other: 'אחר' },
  qHouseholdNote: 'משהו להוסיף על מי שגר שם?',
  phHouseholdNote: 'למשל: שלושה ילדים וסבתא',
  qHomeVibe: 'איזה סוג בית יש לכם?',
  homeVibe: { small: 'קטן', large: 'גדול', renovated: 'משופץ', older: 'ישן' },
  qHomeNote: 'משהו נוסף על הבית?',
  phHomeNote: 'למשל: הרבה זכוכית ורצפת פרקט',
  petsTitle: 'חיות מחמד',

  needsTitle: 'צרכי הניקיון שלכם',
  needsSub: 'מה בדרך כלל צריך. כל בקשה שתשלחו יכולה להיות שונה.',
  qFrequency: 'באיזו תדירות אתם בדרך כלל צריכים עזרה?',
  frequency: { weekly: 'כל שבוע', twice_monthly: 'פעמיים בחודש', monthly: 'פעם בחודש', occasional: 'מדי פעם', one_time: 'פעם אחת', other: 'אחר' },
  qType: 'איזה סוג ניקיון אתם בדרך כלל צריכים?',
  cleaningType: { regular: 'ניקיון רגיל', deep: 'ניקיון יסודי', both: 'שניהם' },
  qTasks: 'במה בדרך כלל תרצו עזרה?',
  tasks: { kitchen: 'מטבח', bathrooms: 'חדרי אמבטיה', floors: 'רצפות', dusting: 'ניקוי אבק', windows: 'חלונות', linens: 'החלפת מצעים', laundry: 'כביסה', dishes: 'כלים', outdoor: 'שטח חיצוני', other: 'אחר' },
  phTaskOther: 'מה עוד?',
  qHours: 'בערך כמה זמן נמשך ביקור רגיל?',
  hoursUnit: 'ש׳',
  hoursHint: 'הערכה גסה מספיקה.',
  qDays: 'אילו ימים בדרך כלל מתאימים לכם?',
  days: { sun: 'א׳', mon: 'ב׳', tue: 'ג׳', wed: 'ד׳', thu: 'ה׳', fri: 'ו׳', sat: 'שבת' },
  daysFlexible: 'גמישים',
  qFlexibility: 'עד כמה אתם גמישים לגבי התזמון והיקף העבודה?',
  flexibility: { fixed: 'די קבוע', somewhat: 'גמישות מסוימת', very: 'גמישים מאוד' },
  qExtra: 'יש עוד משהו שחשוב לכם שהמנקה ידע?',
  phExtra: 'למשל: נשמח אם תשלחו לנו רשימה של מה שאתם צריכים, כדי שנבדוק אם יש לנו לפני שתגיעו',
  extraHint: 'מנקים שתשלחו להם בקשה יוכלו לקרוא את זה. נא לא לכתוב כאן קודי כניסה או פרטי גישה.',

  storyTitle: 'עלינו',
  storySub: 'כתבנו את זה מהתשובות שלכם. אפשר לשנות כל דבר.',
  storyEmpty: 'ענו על כמה שאלות קודם, או כתבו בעצמכם.',
  generate: 'כתבו לי את זה',
  regenerate: 'כתבו שוב',
  generatedNote: 'נבנה רק ממה שעניתם',
  replaceConfirm: 'להחליף את מה שכתבתם בגרסה חדשה?',
  storyPrivacy: 'מנקים שתשלחו להם בקשה יוכלו לקרוא את זה. נא לא לכתוב קודי כניסה.',
  boxLabel: 'ההיכרות שלכם',

  previewAbout: 'עלינו',
  previewNeeds: 'צרכי ניקיון',
}

export const HOST_STRINGS: Record<HostLang, typeof en> = { en, he }
export const hostStrings = (lang: HostLang) => HOST_STRINGS[lang] ?? en
