import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "הצהרת נגישות | Clean",
  description: "הצהרת הנגישות של אתר Clean בהתאם לתקן הישראלי IS 5568.",
};

// Mandatory accessibility statement (הצהרת נגישות) under IS 5568.
// The article is explicitly dir="rtl" lang="he" so the Hebrew legal text renders
// correctly even when the rest of the site is being viewed in English.
// TODO: fill in the bracketed placeholders before going live (coordinator name,
// phone, email, and keep the "last updated" date current).
export default function AccessibilityStatementPage() {
  return (
    <article
      dir="rtl"
      lang="he"
      className="mx-auto max-w-3xl px-4 py-10 leading-relaxed text-gray-800"
    >
      <h1 className="mb-6 text-2xl font-bold">הצהרת נגישות</h1>

      <p className="mb-4">
        אנו ב-Clean מחויבים להנגשת האתר לאנשים עם מוגבלויות בהתאם לתקן הישראלי
        IS 5568, המעוגן ב-WCAG 2.0 ברמה AA, ובהתאם לחוק שוויון זכויות לאנשים עם
        מוגבלות, התשנ&quot;ח-1998 ולתקנות הנגישות לשירות, התשע&quot;ג-2013.
      </p>

      <h2 className="mb-3 mt-6 text-xl font-semibold">אמצעי נגישות באתר</h2>
      <ul className="mb-4 list-disc space-y-1 pe-6">
        <li>האתר תומך בניווט מלא באמצעות מקלדת.</li>
        <li>האתר כולל קישור &quot;דלג לתוכן הראשי&quot; בראש כל עמוד.</li>
        <li>האתר תומך בקוראי מסך (NVDA, JAWS, VoiceOver).</li>
        <li>האתר מוגדר בכיוון כתיבה מימין לשמאל (RTL) עם תמיכה בעברית.</li>
        <li>תמונות מלוות בטקסט חלופי.</li>
        <li>ניגודיות הצבעים עומדת ביחס של 4.5:1 לפחות.</li>
      </ul>

      <h2 className="mb-3 mt-6 text-xl font-semibold">החרגות ומגבלות ידועות</h2>
      <p className="mb-4">
        ייתכן שחלקים מסוימים באתר טרם הונגשו במלואם. אנו פועלים לתיקון ליקויים אלה
        באופן שוטף. אם נתקלתם בבעיית נגישות, נשמח שתפנו אלינו (ראו פרטים להלן).
      </p>

      <h2 className="mb-3 mt-6 text-xl font-semibold">פנייה בנושא נגישות</h2>
      <p className="mb-1">רכז/ת נגישות: [שם הרכז/ת]</p>
      <p className="mb-1">
        טלפון:{" "}
        <a href="tel:+972000000000" dir="ltr" className="text-blue-600 underline">
          +972-00-000-0000
        </a>
      </p>
      <p className="mb-4">
        דוא&quot;ל:{" "}
        <a href="mailto:accessibility@clean.example" className="text-blue-600 underline">
          accessibility@clean.example
        </a>
      </p>

      <p className="text-sm text-gray-500">תאריך עדכון אחרון: 19 ביוני 2026</p>
    </article>
  );
}
