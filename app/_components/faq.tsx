/**
 * FAQ section — native <details> accordion (no client JS, keyboard-accessible).
 * FAQ_ITEMS is the single source of truth: page.tsx maps it into FAQPage
 * JSON-LD so the rendered answers and the structured data can never diverge.
 * Every answer states only facts that already appear elsewhere on the page
 * (sizes.ts / descParas) — no invented claims.
 */

const ACCENT = "#2f8fd6";

export type FaqItem = { q: string; a: string };

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "האם צריך היתר בנייה למחסן גינה?",
    a: 'על פי תקנות התכנון והבנייה (עבודות ומבנים הפטורים מהיתר), מחסן ששטחו עד 6 מ"ר ובעל גג משופע שגובהו עד 2.4 מ\' פטור בדרך כלל מהיתר בנייה — למשל דגם 2x2 שלנו (4 מ"ר, גג חד־שיפועי בגובה 2.3 מ\'), בכפוף לתנאי הפטור ולהנחיות הוועדה המקומית. לגדלים גדולים יותר מומלץ לברר מול מחלקת ההנדסה ברשות המקומית לפני ההזמנה.',
  },
  {
    q: "ממה עשוי המחסן ומה רמת הבידוד?",
    a: 'המחסן בנוי מפאנל מבודד ("סנדוויץ\' פאנל"): שתי שכבות פח פלדה מגולוון בעובי 0.5 מ"מ, צבוע בתנור, וביניהן שכבת פוליסטירן מוקצף בעובי 50 מ"מ. הפאנל מעניק בידוד תרמי של כ־12 מעלות מהחוץ, והמבנה חסין לפגעי מזג אוויר קיצוני ומיוצר בארץ.',
  },
  {
    q: "אילו גדלים קיימים ומה טווח המחירים?",
    a: "שישה גדלים סטנדרטיים: מ־2x2 מ' (₪4,150) ועד 3x4 מ' (₪6,650). כל הדגמים בגובה 2.20–2.30 מ' עם גג חד־שיפועי. המחיר הסופי נקבע לפי הגודל והתוספות שבוחרים במחירון שבעמוד.",
  },
  {
    q: "מה כולל שירות ההובלה וההרכבה?",
    a: "הובלה והרכבה מקצועית בתוספת ₪2,350. ההובלה מתייחסת לפריקה מישורית עד 15 מטר ממקום החנייה; סבלות מעבר לכך בתוספת תשלום במזומן ישירות למתקינים. אפשר גם לחסוך את התוספת ולאסוף באיסוף עצמי.",
  },
  {
    q: "מה זמן האספקה?",
    a: "זמן האספקה הוא עד 21 ימי עסקים מרגע ההזמנה, וקיימת אפשרות לאיסוף עצמי.",
  },
  {
    q: "לאילו שימושים המחסן מתאים?",
    a: "מעבר לאחסון גינה קלאסי, המבנה המבודד משמש גם כמשרד ביתי, חדר עבודה, קליניקה, עמדת שומר ועוד — הבידוד התרמי והגימור מאפשרים שהייה נוחה לאורך כל השנה.",
  },
  {
    q: "האם המחסן דורש תחזוקה שוטפת?",
    a: "לא. הפח המגולוון הצבוע בתנור עמיד לאורך שנים רבות ללא צורך בתחזוקה, צביעה או איטום תקופתי, ומתאים לאקלים הישראלי.",
  },
];

export default function FaqSection() {
  return (
    <div data-id="faq-section" style={{ marginTop: 64 }}>
      <h2
        data-id="faq-title"
        style={{
          margin: 0,
          fontSize: 25,
          fontWeight: 800,
          color: "#2f2f2f",
          textAlign: "right",
          paddingBottom: 10,
          position: "relative",
        }}
      >
        שאלות נפוצות
        <span
          data-id="faq-title-line"
          style={{ position: "absolute", bottom: 0, right: 0, width: "50%", height: 1, background: "#e2e2e2" }}
        />
        <span
          data-id="faq-title-underline"
          style={{ position: "absolute", bottom: -1, right: 0, width: 150, height: 3, background: ACCENT, borderRadius: 2 }}
        />
      </h2>

      <div data-id="faq-list" style={{ marginTop: 24, maxWidth: 860 }}>
        {FAQ_ITEMS.map((item, i) => (
          <details key={i} data-id={`faq-item-${i}`} className="faq-item">
            <summary data-id={`faq-question-${i}`} className="faq-question">
              {item.q}
            </summary>
            <p
              data-id={`faq-answer-${i}`}
              style={{ margin: "10px 0 4px", fontSize: 16, lineHeight: 1.9, color: "#4a4a4a" }}
            >
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
