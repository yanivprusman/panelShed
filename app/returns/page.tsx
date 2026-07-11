import type { Metadata } from "next";
import Link from "next/link";
import { Assistant } from "next/font/google";
import { BRAND, PHONE_DISPLAY, TEL_URL, EMAIL, MAIL_URL } from "../_components/contact";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `מדיניות ביטול והחזרות | ${BRAND}`,
  description:
    "מדיניות ביטול עסקה והחזרת מוצרים של פאנל-שד — ביטול תוך 14 יום בהתאם לחוק הגנת הצרכן, דמי ביטול, עלויות הובלה והחזר כספי.",
};

const ACCENT = "#2f8fd6";

const h2: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  color: "#2f2f2f",
  margin: "34px 0 12px",
};

const p: React.CSSProperties = {
  margin: "0 0 14px",
  fontSize: 16,
  lineHeight: 1.85,
  color: "#4a4a4a",
};

const li: React.CSSProperties = { marginBottom: 8 };

const link: React.CSSProperties = { color: ACCENT, fontWeight: 700 };

/**
 * מדיניות ביטול והחזרות — the return-policy page Google Merchant Center
 * verifies (registered as the account's return policy URL). Reflects the
 * user's decision (2026-07-11): 14-day cancellation per Israeli consumer law,
 * cancellation fee 5% / ₪100 (the lower), and the buyer bears delivery costs
 * in BOTH directions (the outbound delivery fee is not refunded and the
 * return transport is on the buyer). Defective goods follow the statutory
 * remedy at the business's expense.
 */
export default function ReturnsPolicy() {
  return (
    <main
      id="main-content"
      data-id="returns-policy"
      className={assistant.className}
      dir="rtl"
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: "48px 24px 80px",
        color: "#3a3a3a",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <h1
        data-id="returns-title"
        style={{ fontSize: 30, fontWeight: 800, color: "#2f2f2f", margin: "0 0 8px" }}
      >
        מדיניות ביטול והחזרות
      </h1>
      <p style={{ ...p, color: "#8a8a8a", fontSize: 14 }}>
        בהתאם לחוק הגנת הצרכן, התשמ"א-1981 ולתקנות הגנת הצרכן (ביטול עסקה), התשע"א-2010
      </p>

      <h2 style={h2} data-id="returns-cancel-title">
        ביטול עסקה
      </h2>
      <p style={p}>
        ניתן לבטל עסקה שנעשתה באתר תוך 14 ימים מיום קבלת המוצר, או מיום קבלת מסמך פרטי
        העסקה — לפי המאוחר מביניהם. הודעת ביטול ניתן למסור בטלפון, בוואטסאפ או בדוא"ל
        (הפרטים בתחתית העמוד), בציון שם מלא ומספר ההזמנה.
      </p>
      <ul style={{ margin: "0 0 14px", paddingInlineStart: 22, fontSize: 16, lineHeight: 1.85, color: "#4a4a4a" }}>
        <li style={li} data-id="returns-fee">
          בביטול שלא עקב פגם או אי-התאמה ייגבו דמי ביטול בשיעור 5% ממחיר העסקה או 100 ₪ —
          הנמוך מביניהם.
        </li>
        <li style={li} data-id="returns-shipping-both-ways">
          עלויות ההובלה חלות על הלקוח בשני הכיוונים: דמי הובלה ו/או הרכבה ששולמו עבור
          שירות שכבר ניתן אינם מוחזרים, והחזרת המוצר לעסק תיעשה על ידי הלקוח ועל חשבונו.
        </li>
        <li style={li} data-id="returns-condition">
          המוצר יוחזר שלם, ללא פגיעה או נזק, ובמצב שבו נמסר.
        </li>
        <li style={li} data-id="returns-refund">
          ההחזר הכספי יבוצע תוך 14 ימים ממועד קבלת הודעת הביטול, לאותו אמצעי תשלום שבו
          בוצעה העסקה.
        </li>
      </ul>

      <h2 style={h2} data-id="returns-defect-title">
        מוצר פגום או אי-התאמה
      </h2>
      <p style={p}>
        התקבל מוצר פגום, או מוצר שאינו תואם את פרטי ההזמנה? צרו קשר בהקדם ונדאג לתיקון,
        להחלפה או להחזר כספי מלא בהתאם להוראות החוק. במקרה של ביטול עקב פגם או אי-התאמה
        לא ייגבו דמי ביטול, ועלות החזרת המוצר תחול על העסק.
      </p>

      <h2 style={h2} data-id="returns-exchange-title">
        החלפות
      </h2>
      <p style={p}>
        ניתן להחליף דגם או גודל בתיאום מראש, בכפוף להפרשי מחיר ולעלויות הובלה כמפורט
        לעיל.
      </p>

      <h2 style={h2} data-id="returns-contact-title">
        יצירת קשר
      </h2>
      <p style={p}>
        טלפון:{" "}
        <a href={TEL_URL} dir="ltr" style={link} data-id="returns-phone">
          {PHONE_DISPLAY}
        </a>
        {" · "}
        דוא"ל:{" "}
        <a href={MAIL_URL} style={link} data-id="returns-email">
          {EMAIL}
        </a>
      </p>

      <p style={{ ...p, marginTop: 30 }}>
        <Link href="/" style={link} data-id="returns-back-home">
          ← חזרה לעמוד הראשי
        </Link>
      </p>
    </main>
  );
}
