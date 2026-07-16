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
  title: `תקנון האתר | ${BRAND}`,
  description:
    "תקנון אתר פאנל-שד — פרטי העסק, תנאי רכישה, מחירים ותשלום, אספקה והרכבה, אחריות וביטול עסקה.",
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
 * תקנון האתר — the site's terms of use / purchase terms page. Publishes the
 * business identity (legal name + ע.מ) and the commercial terms already shown
 * on the storefront, in one canonical legal page. Added as part of the trust
 * signals Google Merchant Center's Misrepresentation policy expects from an
 * online store (business identity, terms, policies).
 */
export default function Terms() {
  return (
    <main
      id="main-content"
      data-id="terms"
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
        data-id="terms-title"
        style={{ fontSize: 30, fontWeight: 800, color: "#2f2f2f", margin: "0 0 8px" }}
      >
        תקנון האתר
      </h1>
      <p style={{ ...p, color: "#8a8a8a", fontSize: 14 }}>
        השימוש באתר ורכישה בו מהווים הסכמה לתנאים המפורטים להלן
      </p>

      <h2 style={h2} data-id="terms-business-title">
        פרטי העסק
      </h2>
      <p style={p} data-id="terms-business-details">
        האתר {BRAND} מופעל על ידי {LEGAL_NAME}, עוסק מורשה מס׳{" "}
        <span dir="ltr">{BUSINESS_ID}</span> (להלן: "העסק"). העסק עוסק במכירה,
        הובלה והתקנה של מחסנים ומבנים מפאנל מבודד בכל הארץ.
      </p>
      <p style={p} data-id="terms-business-contact">
        יצירת קשר: טלפון{" "}
        <a href={TEL_URL} dir="ltr" style={link} data-id="terms-phone">
          {PHONE_DISPLAY}
        </a>
        {" · "}
        דוא"ל{" "}
        <a href={MAIL_URL} style={link} data-id="terms-email">
          {EMAIL}
        </a>
      </p>

      <h2 style={h2} data-id="terms-products-title">
        המוצרים והמחירים
      </h2>
      <ul style={ul}>
        <li style={li} data-id="terms-prices-vat">
          כל המחירים באתר נקובים בשקלים חדשים וכוללים מע"מ.
        </li>
        <li style={li} data-id="terms-price-components">
          המחיר הסופי של הזמנה נקבע לפי הגודל והתוספות שנבחרו (הובלה, הרכבה,
          במת עץ) כמפורט בעמוד המוצר לפני התשלום.
        </li>
        <li style={li} data-id="terms-made-to-order">
          המחסנים מיוצרים בישראל לפי הזמנה. התמונות באתר להמחשה; ייתכנו הבדלים
          קלים בגוון ובגימור.
        </li>
      </ul>

      <h2 style={h2} data-id="terms-payment-title">
        תשלום
      </h2>
      <ul style={ul}>
        <li style={li} data-id="terms-payment-methods">
          התשלום מתבצע בדף תשלום מאובטח של ספק סליקה חיצוני, בכרטיס אשראי,
          Bit‏, Apple Pay או Google Pay, עם אפשרות לתשלומים ללא ריבית.
        </li>
        <li style={li} data-id="terms-payment-security">
          פרטי אמצעי התשלום נמסרים ישירות לספק הסליקה ואינם נשמרים בשרתי האתר.
        </li>
        <li style={li} data-id="terms-order-confirmation">
          הזמנה נחשבת מאושרת רק לאחר אישור התשלום על ידי ספק הסליקה.
        </li>
      </ul>

      <h2 style={h2} data-id="terms-delivery-title">
        אספקה, הובלה והרכבה
      </h2>
      <ul style={ul}>
        <li style={li} data-id="terms-delivery-time">
          זמן האספקה הוא עד 21 ימי עסקים ממועד אישור ההזמנה. קיימת אפשרות
          לאיסוף עצמי ללא עלות הובלה.
        </li>
        <li style={li} data-id="terms-delivery-scope">
          ההובלה מתייחסת לפריקה מישורית עד 15 מטר ממקום החנייה. סבלות מעבר לכך
          כרוכה בתוספת תשלום, במזומן ישירות למתקינים.
        </li>
        <li style={li} data-id="terms-assembly">
          שירות ההרכבה ניתן רק יחד עם הובלה, בתיאום מועד מראש עם הלקוח.
        </li>
      </ul>

      <h2 style={h2} data-id="terms-warranty-title">
        אחריות
      </h2>
      <p style={p}>
        המוצרים מסופקים באחריות לפגמי ייצור בהתאם להוראות הדין, ובכלל זה חוק
        המכר, התשכ"ח-1968 וחוק הגנת הצרכן, התשמ"א-1981. בכל פנייה בנושא אחריות
        ניתן ליצור קשר בפרטים שלעיל.
      </p>

      <h2 style={h2} data-id="terms-cancellation-title">
        ביטול עסקה והחזרות
      </h2>
      <p style={p}>
        ביטול עסקה והחזרת מוצרים — בהתאם ל
        <Link href="/returns" style={link} data-id="terms-returns-link">
          מדיניות הביטול וההחזרות
        </Link>{" "}
        של האתר, על פי חוק הגנת הצרכן.
      </p>

      <h2 style={h2} data-id="terms-privacy-title">
        פרטיות
      </h2>
      <p style={p}>
        המידע הנמסר באתר מטופל בהתאם ל
        <Link href="/privacy" style={link} data-id="terms-privacy-link">
          מדיניות הפרטיות
        </Link>{" "}
        של האתר.
      </p>

      <h2 style={h2} data-id="terms-law-title">
        דין וסמכות שיפוט
      </h2>
      <p style={p}>
        על השימוש באתר ועל כל עסקה שתיעשה בו יחול הדין הישראלי בלבד. הרכישה
        באתר מיועדת לבני 18 ומעלה.
      </p>

      <p style={{ ...p, marginTop: 30 }}>
        <Link href="/" style={link} data-id="terms-back-home">
          ← חזרה לעמוד הראשי
        </Link>
      </p>
    </main>
  );
}
