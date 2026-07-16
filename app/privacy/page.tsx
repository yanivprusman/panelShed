import type { Metadata } from "next";
import Link from "next/link";
import { Assistant } from "next/font/google";
import {
  BRAND,
  LEGAL_NAME,
  BUSINESS_ID,
  PHONE_DISPLAY,
  TEL_URL,
  EMAIL,
  MAIL_URL,
} from "../_components/contact";

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: `מדיניות פרטיות | ${BRAND}`,
  description:
    "מדיניות הפרטיות של פאנל-שד — איזה מידע נאסף באתר, למה הוא משמש, שימוש בעוגיות ומדידת המרות, וזכויות הפונים.",
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

const ul: React.CSSProperties = {
  margin: "0 0 14px",
  paddingInlineStart: 22,
  fontSize: 16,
  lineHeight: 1.85,
  color: "#4a4a4a",
};

const li: React.CSSProperties = { marginBottom: 8 };

const link: React.CSSProperties = { color: ACCENT, fontWeight: 700 };

/**
 * מדיניות פרטיות — privacy policy page. Describes exactly what the site
 * actually collects (order form: name, phone, optional email), the external
 * payment provider, and the Google Ads conversion tag loaded in app/layout.tsx.
 * Part of the trust signals required by Google Merchant Center's
 * Misrepresentation policy.
 */
export default function Privacy() {
  return (
    <main
      id="main-content"
      data-id="privacy"
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
        data-id="privacy-title"
        style={{ fontSize: 30, fontWeight: 800, color: "#2f2f2f", margin: "0 0 8px" }}
      >
        מדיניות פרטיות
      </h1>
      <p style={{ ...p, color: "#8a8a8a", fontSize: 14 }}>
        מדיניות זו מפרטת איזה מידע נאסף באתר {BRAND}, המופעל על ידי {LEGAL_NAME}{" "}
        (ע.מ <span dir="ltr">{BUSINESS_ID}</span>), וכיצד הוא משמש
      </p>

      <h2 style={h2} data-id="privacy-collected-title">
        איזה מידע נאסף
      </h2>
      <ul style={ul}>
        <li style={li} data-id="privacy-order-data">
          בעת ביצוע הזמנה נאספים שם מלא, מספר טלפון נייד ודוא"ל (אם נמסר),
          יחד עם פרטי ההזמנה — לצורך טיפול בהזמנה, תיאום אספקה ויצירת קשר.
        </li>
        <li style={li} data-id="privacy-no-card-data">
          פרטי אמצעי התשלום נמסרים ישירות בדף מאובטח של ספק הסליקה החיצוני
          ואינם נשמרים בשרתי האתר.
        </li>
        <li style={li} data-id="privacy-whatsapp">
          פנייה בוואטסאפ או בטלפון נעשית ביוזמת הפונה, והמידע בה משמש למענה
          ולמתן השירות בלבד.
        </li>
      </ul>

      <h2 style={h2} data-id="privacy-usage-title">
        שימוש במידע
      </h2>
      <p style={p}>
        המידע משמש אך ורק לטיפול בהזמנות, לתיאום הובלה והרכבה, למתן שירות
        ולעמידה בחובות על פי דין. המידע אינו נמכר ואינו מועבר לצדדים שלישיים,
        למעט ספקים המעורבים בביצוע העסקה (כגון ספק הסליקה וגורמי ההובלה)
        וככל שנדרש על פי דין.
      </p>

      <h2 style={h2} data-id="privacy-cookies-title">
        עוגיות ומדידת המרות
      </h2>
      <p style={p}>
        האתר עושה שימוש בתג המרות של Google Ads לצורך מדידת אפקטיביות פרסום
        (למשל, השלמת רכישה או שליחת פנייה). התג עושה שימוש בעוגיות (Cookies)
        של Google בהתאם למדיניות הפרטיות של Google. ניתן לחסום עוגיות בהגדרות
        הדפדפן מבלי לפגוע ביכולת לרכוש באתר.
      </p>

      <h2 style={h2} data-id="privacy-rights-title">
        זכויות הפונים
      </h2>
      <p style={p}>
        בהתאם לחוק הגנת הפרטיות, התשמ"א-1981, ניתן לפנות אלינו בבקשה לעיין
        במידע שנאסף, לתקנו או למחקו, בפרטי הקשר שלהלן.
      </p>

      <h2 style={h2} data-id="privacy-contact-title">
        יצירת קשר
      </h2>
      <p style={p}>
        טלפון:{" "}
        <a href={TEL_URL} dir="ltr" style={link} data-id="privacy-phone">
          {PHONE_DISPLAY}
        </a>
        {" · "}
        דוא"ל:{" "}
        <a href={MAIL_URL} style={link} data-id="privacy-email">
          {EMAIL}
        </a>
      </p>

      <p style={{ ...p, marginTop: 30 }}>
        <Link href="/" style={link} data-id="privacy-back-home">
          ← חזרה לעמוד הראשי
        </Link>
      </p>
    </main>
  );
}
