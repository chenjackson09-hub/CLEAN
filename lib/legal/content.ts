// The Terms of Use and Privacy Policy, in English and Hebrew, written from what the app really
// does (who sees what, where data lives, no in-app payments). It is a plain-language DRAFT: while
// LEGAL_DRAFT is true every page says so, and it should be read by a lawyer before launch.
// Bump TERMS_VERSION whenever the text changes in a way people should agree to again.

export const TERMS_VERSION = '2026-11-02'
export const LEGAL_DRAFT = true

export type LegalSection = { heading: string; body: string[] }
export type LegalDoc = { title: string; updated: string; intro: string; sections: LegalSection[] }
type Lang = 'en' | 'he'

const TERMS: Record<Lang, LegalDoc> = {
  en: {
    title: 'Terms of Use',
    updated: 'Last updated: 2 November 2026',
    intro: 'These terms explain how Clean works and what we expect from everyone who uses it. By creating an account you agree to them.',
    sections: [
      { heading: '1. What Clean is', body: ['Clean is a platform that helps people who need their home cleaned (“hosts”) find independent people who clean (“cleaners”).', 'Clean is not the employer of any cleaner and is not a party to the agreement between a host and a cleaner. Clean does not provide cleaning services itself.'] },
      { heading: '2. Who can use it', body: ['You must give true and current information and keep your account details safe. You are responsible for what happens under your account.', 'Hosts must be 18 or older. Cleaners must be at least 14; cleaners under 18 may go through extra checks.'] },
      { heading: '3. Approval of accounts', body: ['Every new account is reviewed by our team before it can be used to send or accept requests. We may approve, refuse, pause or remove an account, for example if information is untrue or the app is misused.'] },
      { heading: '4. Requests and bookings', body: ['A host sends a request to a cleaner. The cleaner has 24 hours to accept or decline. A clean is confirmed only when the cleaner accepts.', 'Either side can cancel a confirmed clean from the app — please do it as early as you can. Times and durations shown in the app are estimates.'] },
      { heading: '5. Prices and payment', body: ['Cleaners set their own hourly rate. Clean does not take or process payments in the app. The host and the cleaner agree between themselves how and when payment is made.'] },
      { heading: '6. Profiles, photos and reviews', body: ['What you put on your profile is shown as described in the Privacy Policy. Photos of a home are private: they are shown only to a cleaner who has a live request from that host.', 'You must have the right to share anything you upload. Ratings and reviews must be honest and respectful, and we may remove content that is not.'] },
      { heading: '7. How to behave', body: ['Be respectful and honest. Do not harass anyone, share another person’s private information (for example a home’s address, photos or access details), use the app for anything illegal, or try to get around the app’s safety features.'] },
      { heading: '8. Safety', body: ['We do not check people’s identity or background beyond what is described in the app. A “Cindy Verified” mark means our team chose to confirm that person; it is not a guarantee.', 'Use your own judgement and keep your conversations in the app’s chat.'] },
      { heading: '9. Our responsibility', body: ['We work to keep the app running but cannot promise it will always be available or free of errors. To the extent the law allows, Clean is not responsible for what happens during or after a cleaning — including damage, loss or injury — or for indirect losses.'] },
      { heading: '10. Changes', body: ['We may change these terms or the app. If a change is important we will tell you in the app. Continuing to use Clean after a change means you accept it.'] },
      { heading: '11. Contact', body: ['Questions or a problem? Use the Help button in the app.'] },
    ],
  },
  he: {
    title: 'תנאי שימוש',
    updated: 'עודכן לאחרונה: 2 בנובמבר 2026',
    intro: 'התנאים האלה מסבירים איך Clean עובדת ומה אנחנו מצפים מכל מי שמשתמש בה. בפתיחת חשבון אתם מסכימים להם.',
    sections: [
      { heading: '1. מה זו Clean', body: ['Clean היא פלטפורמה שעוזרת לאנשים שצריכים ניקיון בבית (״מארחים״) למצוא אנשים עצמאיים שמנקים (״מנקים״).', 'Clean אינה המעסיקה של אף מנקה ואינה צד להסכם בין מארח למנקה. Clean אינה מספקת שירותי ניקיון בעצמה.'] },
      { heading: '2. מי יכול להשתמש', body: ['עליכם למסור פרטים נכונים ועדכניים ולשמור על פרטי החשבון. אתם אחראים למה שקורה בחשבון שלכם.', 'מארחים צריכים להיות בני 18 ומעלה. מנקים צריכים להיות בני 14 לפחות; מנקים מתחת לגיל 18 עשויים לעבור בדיקות נוספות.'] },
      { heading: '3. אישור חשבונות', body: ['כל חשבון חדש נבדק על ידי הצוות שלנו לפני שאפשר להשתמש בו לשליחה או לקבלה של בקשות. אנחנו רשאים לאשר, לסרב, להשהות או להסיר חשבון, למשל אם המידע אינו נכון או אם נעשה שימוש לרעה באפליקציה.'] },
      { heading: '4. בקשות והזמנות', body: ['מארח שולח בקשה למנקה. למנקה יש 24 שעות לאשר או לדחות. ניקיון מאושר רק כשהמנקה מאשר.', 'כל צד יכול לבטל ניקיון מאושר מתוך האפליקציה — בבקשה עשו זאת מוקדם ככל האפשר. השעות והמשכים שמוצגים באפליקציה הם הערכות.'] },
      { heading: '5. מחירים ותשלום', body: ['מנקים קובעים בעצמם את התעריף לשעה. Clean אינה גובה או מעבדת תשלומים באפליקציה. המארח והמנקה מסכמים ביניהם איך ומתי משלמים.'] },
      { heading: '6. פרופילים, תמונות וחוות דעת', body: ['מה שאתם מציבים בפרופיל מוצג כפי שמפורט במדיניות הפרטיות. תמונות של בית הן פרטיות: הן מוצגות רק למנקה שיש לו בקשה פעילה מאותו מארח.', 'עליכם להיות בעלי הזכות לשתף כל דבר שאתם מעלים. דירוגים וחוות דעת צריכים להיות כנים ומכבדים, ואנחנו רשאים להסיר תוכן שאינו כזה.'] },
      { heading: '7. התנהגות', body: ['היו מכבדים וכנים. אל תטרידו אף אחד, אל תשתפו מידע פרטי על אדם אחר (למשל כתובת, תמונות או פרטי גישה של בית), אל תשתמשו באפליקציה לשום דבר לא חוקי ואל תנסו לעקוף את מנגנוני הבטיחות שלה.'] },
      { heading: '8. בטיחות', body: ['אנחנו לא בודקים זהות או רקע של אנשים מעבר למה שמתואר באפליקציה. סימון ״Cindy Verified״ אומר שהצוות שלנו בחר לאשר את האדם; הוא אינו אחריות לטיב האדם.', 'השתמשו בשיקול דעת משלכם ושמרו על השיחות בצ׳אט של האפליקציה.'] },
      { heading: '9. האחריות שלנו', body: ['אנחנו פועלים כדי שהאפליקציה תפעל, אבל לא יכולים להבטיח שתהיה זמינה תמיד או ללא תקלות. במידה שהחוק מתיר, Clean אינה אחראית למה שקורה במהלך הניקיון או אחריו — כולל נזק, אובדן או פגיעה — ולא להפסדים עקיפים.'] },
      { heading: '10. שינויים', body: ['אנחנו רשאים לשנות את התנאים או את האפליקציה. אם השינוי חשוב נודיע לכם באפליקציה. המשך שימוש ב-Clean אחרי שינוי פירושו שאתם מסכימים לו.'] },
      { heading: '11. יצירת קשר', body: ['שאלות או בעיה? השתמשו בכפתור העזרה באפליקציה.'] },
    ],
  },
}

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
      { heading: '8. Age', body: ['Clean is for people aged 14 and over; hosts must be 18 or older.'] },
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
      { heading: '8. גיל', body: ['Clean מיועדת לבני 14 ומעלה; מארחים צריכים להיות בני 18 ומעלה.'] },
      { heading: '9. שינויים ויצירת קשר', body: ['אם המדיניות תשתנה באופן חשוב נודיע לכם באפליקציה. שאלות? השתמשו בכפתור העזרה באפליקציה.'] },
    ],
  },
}

export function legalDoc(kind: 'terms' | 'privacy', lang: Lang): LegalDoc {
  return (kind === 'terms' ? TERMS : PRIVACY)[lang]
}
