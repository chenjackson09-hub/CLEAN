// The Terms of Use and Privacy Policy, in English and Hebrew, written from what the app really
// does (who sees what, where data lives, no in-app payments). It is a plain-language DRAFT: while
// LEGAL_DRAFT is true every page says so, and it should be read by a lawyer before launch.
// Bump TERMS_VERSION whenever the text changes in a way people should agree to again.

export const TERMS_VERSION = '2026-11-20'
export const LEGAL_DRAFT = true

import { TERMS_EN, TERMS_HE } from './terms'

export type LegalSection = { heading: string; body: string[] }
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] }
type Lang = 'en' | 'he'

const TERMS: Record<Lang, LegalDoc> = { en: TERMS_EN, he: TERMS_HE }

const PRIVACY: Record<Lang, LegalDoc> = {
  en: {
    title: 'Privacy Policy',
    updated: 'Last updated: 2 November 2026',
    intro: 'This explains what information Clean collects, why, and who can see it.',
    sections: [
      { heading: '1. What we collect', body: [
        'Account: your email, your password (stored so we cannot read it) and whether you are a host or a cleaner.',
        'Profile: your name, photo, optional phone number, languages and a short intro. For cleaners also: date of birth (only your age is shown), rate, experience, services and how far you travel.',
        'Place: your town, and a street address if you give one or send a request.',
        'Home (hosts): home type, rooms, floors, pets and optional photos of the home.',
        'Activity: requests, bookings, chat messages, ratings and reviews, notifications and messages to support.',
        'Technical: the basic information needed to run the app and fix errors.',
      ] },
      { heading: '2. How we use it', body: ['To run the service: to create and review your account, show your profile, match hosts and cleaners, handle requests and bookings, send notifications in the app, keep people safe, give support and improve the app.'] },
      { heading: '3. Who can see what', body: [
        'A host sees a cleaner’s profile: name, age, photo, town, rate, experience, languages, intro, services and ratings.',
        'A cleaner sees a host’s profile once there is a request: name, photo, town, home details, pets, languages, intro and ratings. The street address is shared with the cleaner when the host sends a request.',
        'Photos of a home are private. They are shown only to a cleaner who has a live request from that host (waiting for an answer, accepted or completed), through short-lived private links. They are never public.',
        'Your email, password, phone number and date of birth are not shown to other users.',
        'Chat messages are seen only by the two people in the conversation.',
        'Our team can see account information when needed to run the app, answer support requests, review accounts or keep people safe.',
      ] },
      { heading: '4. Services we use', body: [
        'We use trusted providers to run Clean: Supabase (database, sign-in and file storage), Vercel (hosting), OpenStreetMap Nominatim (to find a place from an address you type) and an email provider for some emails.',
        'If you choose them: Google (sign-in, and the “Add to Google Calendar” link). That link carries only the cleaning time, the other person’s name, the town and a link back to the app — never a street address.',
      ] },
      { heading: '5. How long we keep it', body: ['We keep your information while your account exists. Unfinished sign-ups are kept so you can come back to them. You can ask us to delete your account and personal information; some records of past bookings may remain so the other person’s history stays accurate.'] },
      { heading: '6. Your choices', body: ['You can edit most of your information in your profile and remove home photos at any time. To see, correct or delete your information, use the Help button in the app.'] },
      { heading: '7. Security', body: ['We use access rules so people only see what is described above, and private files are not publicly accessible. No system is perfectly secure, so please use a strong password.'] },
      { heading: '8. Age', body: ['Clean is for people aged 18 and over, hosts and cleaners alike.'] },
      { heading: '9. Changes and contact', body: ['If this policy changes in an important way we will tell you in the app. Questions? Use the Help button in the app.'] },
    ],
  },
  he: {
    title: 'מדיניות פרטיות',
    updated: 'עודכן לאחרונה: 2 בנובמבר 2026',
    intro: 'כאן מוסבר איזה מידע Clean אוספת, למה, ומי יכול לראות אותו.',
    sections: [
      { heading: '1. מה אנחנו אוספים', body: [
        'חשבון: האימייל, הסיסמה (נשמרת כך שאיננו יכולים לקרוא אותה) והאם אתם מארחים או מנקים.',
        'פרופיל: שם, תמונה, מספר טלפון (לא חובה), שפות והיכרות קצרה. אצל מנקים גם: תאריך לידה (מוצג רק הגיל), תעריף, ניסיון, סוגי ניקיון ומרחק נסיעה.',
        'מקום: היישוב שלכם, וכתובת רחוב אם מסרתם או שלחתם בקשה.',
        'בית (מארחים): סוג הבית, חדרים, קומות, חיות מחמד ותמונות של הבית (לא חובה).',
        'פעילות: בקשות, הזמנות, הודעות בצ׳אט, דירוגים וחוות דעת, התראות והודעות לתמיכה.',
        'טכני: המידע הבסיסי הדרוש להפעלת האפליקציה ולתיקון תקלות.',
      ] },
      { heading: '2. איך אנחנו משתמשים בו', body: ['כדי להפעיל את השירות: ליצור ולבדוק את החשבון, להציג את הפרופיל, להתאים בין מארחים למנקים, לטפל בבקשות והזמנות, לשלוח התראות באפליקציה, לשמור על בטיחות, לתת תמיכה ולשפר את האפליקציה.'] },
      { heading: '3. מי רואה מה', body: [
        'מארח רואה את הפרופיל של מנקה: שם, גיל, תמונה, יישוב, תעריף, ניסיון, שפות, היכרות קצרה, סוגי ניקיון ודירוגים.',
        'מנקה רואה את הפרופיל של מארח כשיש בקשה: שם, תמונה, יישוב, פרטי הבית, חיות מחמד, שפות, היכרות קצרה ודירוגים. כתובת הרחוב נמסרת למנקה כשהמארח שולח בקשה.',
        'תמונות של בית הן פרטיות. הן מוצגות רק למנקה שיש לו בקשה פעילה מאותו מארח (ממתינה לתשובה, מאושרת או שהושלמה), דרך קישורים פרטיים לזמן קצר. הן אף פעם לא פומביות.',
        'האימייל, הסיסמה, מספר הטלפון ותאריך הלידה שלכם אינם מוצגים למשתמשים אחרים.',
        'הודעות בצ׳אט נראות רק לשני האנשים בשיחה.',
        'הצוות שלנו יכול לראות מידע על חשבונות כשנדרש כדי להפעיל את האפליקציה, לענות לפניות תמיכה, לבדוק חשבונות או לשמור על בטיחות.',
      ] },
      { heading: '4. שירותים שאנחנו משתמשים בהם', body: [
        'אנחנו משתמשים בספקים מהימנים להפעלת Clean: Supabase (מסד נתונים, התחברות ואחסון קבצים), Vercel (אחסון האתר), OpenStreetMap Nominatim (כדי למצוא מקום לפי כתובת שהקלדתם) וספק אימייל לחלק מההודעות.',
        'אם תבחרו בהם: Google (התחברות, והקישור ״הוספה ליומן Google״). הקישור הזה מעביר רק את שעת הניקיון, שם האדם השני, היישוב וקישור חזרה לאפליקציה — אף פעם לא כתובת רחוב.',
      ] },
      { heading: '5. כמה זמן אנחנו שומרים', body: ['אנחנו שומרים את המידע כל עוד החשבון קיים. הרשמות שלא הושלמו נשמרות כדי שתוכלו לחזור אליהן. אפשר לבקש מאיתנו למחוק את החשבון והמידע האישי; חלק מהרשומות על הזמנות קודמות עשויות להישאר כדי שההיסטוריה של האדם השני תישאר מדויקת.'] },
      { heading: '6. הבחירות שלכם', body: ['אפשר לערוך את רוב המידע בפרופיל ולהסיר תמונות של הבית בכל עת. כדי לראות, לתקן או למחוק את המידע שלכם, השתמשו בכפתור העזרה באפליקציה.'] },
      { heading: '7. אבטחה', body: ['אנחנו משתמשים בכללי גישה כדי שאנשים יראו רק את מה שמתואר למעלה, וקבצים פרטיים אינם נגישים לציבור. אין מערכת מאובטחת לחלוטין, ולכן השתמשו בסיסמה חזקה.'] },
      { heading: '8. גיל', body: ['Clean מיועדת לבני 18 ומעלה, מארחים ומנקים כאחד.'] },
      { heading: '9. שינויים ויצירת קשר', body: ['אם המדיניות תשתנה באופן חשוב נודיע לכם באפליקציה. שאלות? השתמשו בכפתור העזרה באפליקציה.'] },
    ],
  },
}

// The short agreement shown on the sign-up screen, above the checkbox.
export type LegalSummary = { title: string; intro: string; lead: string; points: { label: string; text: string }[] }
const SUMMARY: Record<Lang, LegalSummary> = {
  en: {
    title: 'Welcome to Cindy Clean Beta!',
    intro: 'Cindy Clean is an invitation-only beta platform connecting Hosts with Cleaners in Israel.',
    lead: 'Before joining, please understand:',
    points: [
      { label: 'Beta testing', text: 'The App is still under development and may contain bugs or incomplete features.' },
      { label: 'Matching service', text: 'Cindy Clean connects Hosts and Cleaners but does not perform or supervise cleaning services.' },
      { label: 'Independent arrangements', text: 'Cleaners set their hourly rates and availability, and choose which requests to accept.' },
      { label: 'Payments', text: 'All payments happen directly between Hosts and Cleaners, outside the App.' },
      { label: 'Safety', text: 'Cindy Clean does not currently verify identities or provide cleaning-service insurance. Users are responsible for their conduct, subject to applicable law.' },
      { label: 'Cancellations', text: 'Both parties can cancel bookings. Cancellation updates appear in the App and are also sent by email. Push notifications are not currently available.' },
      { label: 'Account rules', text: 'Serious misconduct or repeated policy violations may result in suspension or removal.' },
    ],
  },
  he: {
    title: 'ברוכים הבאים לבטא של Cindy Clean!',
    intro: 'Cindy Clean היא פלטפורמת בטא בהזמנה בלבד שמחברת בין מארחים למנקים בישראל.',
    lead: 'לפני שמצטרפים, חשוב להבין:',
    points: [
      { label: 'בדיקות בטא', text: 'האפליקציה עדיין בפיתוח ועלולה להכיל באגים או תכונות לא גמורות.' },
      { label: 'שירות התאמה', text: 'Cindy Clean מחברת בין מארחים למנקים אבל אינה מבצעת או מפקחת על שירותי ניקיון.' },
      { label: 'הסדרים עצמאיים', text: 'מנקים קובעים את תעריפי השעה והזמינות שלהם ובוחרים אילו בקשות לאשר.' },
      { label: 'תשלומים', text: 'כל התשלומים מתבצעים ישירות בין מארחים למנקים, מחוץ לאפליקציה.' },
      { label: 'בטיחות', text: 'Cindy Clean אינה מאמתת כרגע זהויות ואינה מספקת ביטוח לשירותי ניקיון. המשתמשים אחראים להתנהגותם, בכפוף לחוק החל.' },
      { label: 'ביטולים', text: 'שני הצדדים יכולים לבטל הזמנות. עדכוני ביטול מופיעים באפליקציה ונשלחים גם באימייל. התראות דחיפה אינן זמינות כרגע.' },
      { label: 'כללי חשבון', text: 'התנהגות פסולה חמורה או הפרות חוזרות של המדיניות עלולות להוביל להשעיה או להסרה.' },
    ],
  },
}

export function legalSummary(lang: Lang): LegalSummary {
  return SUMMARY[lang]
}

export function legalDoc(kind: 'terms' | 'privacy', lang: Lang): LegalDoc {
  return (kind === 'terms' ? TERMS : PRIVACY)[lang]
}
