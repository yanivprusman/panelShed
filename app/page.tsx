import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Assistant } from "next/font/google";
import Product3D from "./_components/product-3d";
import ProductGallery from "./_components/product-gallery";
import BuyPanel from "./_components/buy-panel";
import ProductDims from "./_components/product-dims";
import { SizeProvider } from "./_components/size-context";

const galleryImages = [
  "/products/lehamhasha.png",
  "/products/panel-shed-render.png",
];

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "מחסן גינה פאנל מבודד 2x2 מטר",
  description:
    "מחסן גינה מפאנל מבודד בעובי 5 ס\"מ — חסין לפגעי מזג אוויר, בידוד וגימור ברמה גבוהה, מיוצר בארץ.",
};

// ── Content (ported from the design's renderVals) ──────────────────────────
const product = {
  title: "מחסן גינה פאנל מבודד 2x2 מטר",
  // LOCKED: exactly two configurator options — delivery (הובלה+הרכבה) and
  // floor (ריצפה). Do NOT re-add "תוספת שדרוג דלת" (door) or "חלונות ופתחי
  // אוורור" (windows/vents) — the user removed them and they regressed; see
  // AGENTS.md and `npm run check:regression`.
  options: [
    {
      label: "הובלה+הרכבה:",
      choices: [
        { label: "ללא", price: null },
        { label: "הובלה והרכבה", price: 2350 },
      ],
    },
    {
      label: "ריצפה",
      choices: [
        { label: "ללא", price: null },
        { label: "במת דק מעץ אורן מלא", price: 1650 },
      ],
    },
  ],
  buyLabel: "קנה עכשיו",
  delivery: "זמן אספקה: 21 ימי עסקים , קיימת אפשרות לאיסוף עצמי",
  trustTitle: "למה לקוחות קונים אצלנו:",
  trustPoints: [
    "אפשרות לעד 5 תשלומים ללא ריבית",
    "קנייה מאובטחת ושירות לקוחות מעולה",
  ],
  askLabel: "שאל אותנו על מוצר זה",
  descTitle: "תיאור המוצר",
  descParas: [
    'מחסן גינה מפאנל מבודד בעובי 5 ס"מ\nהמחסן חסין לפגעי מזג אוויר קיצוני, ומקנה רמה גבוהה של בידוד וגימור.\nמיוצר בארץ ועומד בסטנדרטים ובתקנים הגבוהים ביותר בעולם\nעמידות לאורך שנים רבות ללא צורך בתחזוקה כלל\nיכל לשמש כמחסן|משרד|חדר מגורים|חדר עבודה|קליניקה|עמדת שומר|ן ועוד...',
    'הפנל מורכב משתי שכבות של פח מגולוון צבוע בתנור בעובי חצי מ"מ ושכבת פוליסטירן מוקצף בעובי 50 מ"מ.',
    'ההובלה מתייחסת לפריקה מישורית עד 15 מטר ממקום החנייה. ישנה תוספת עבור סבלות, מעבר לנאמר, במזומן ישירות למתקינים.\nהפאנל מבודד עשוי 2 שכבות של פח פלדה 0.5 מ"מ מגולוון וצבוע בתנור.\nבין שתי שכבות הפח קיימת שכבת פוליסטירן מוקצף שמבודד טרמית כ-12 מעלות מהחוץ.\nהמבנים שלנו מתאימים לאקלים הישראלי ועומדים בכל התקנים הנדרשים עפ"י החוק. ולכן ניתן להשתמש בהם כמחסן|משרד|חדר מגורים|חדר עבודה|קליניקה|עמדת שומר|ן ועוד...',
  ],
  phone: "055-667-7260",
};

const ACCENT = "#2f8fd6";

const PHONE_E164 = "972556677260";
const TEL_URL = `tel:+${PHONE_E164}`;
const WHATSAPP_URL = `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(
  "שלום, אשמח לקבל פרטים על מחסן גינה פאנל מבודד 2x2 מטר",
)}`;

const badges: { label: string; icon: ReactNode }[] = [
  {
    label: "תשלום מאובטח",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="6" y1="14" x2="11" y2="14" />
      </svg>
    ),
  },
  {
    label: "משלוחים מהירים",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="6" width="13" height="10" rx="1" />
        <path d="M14 9h4l3 3v4h-7z" />
        <circle cx="6" cy="18" r="1.6" />
        <circle cx="18" cy="18" r="1.6" />
      </svg>
    ),
  },
  {
    label: "מוצרים באחריות",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div
      className={assistant.className}
      dir="rtl"
      style={{
        color: "#3a3a3a",
        background: "#ffffff",
        minHeight: "100vh",
        padding: "36px 28px 80px",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
       <SizeProvider>
        {/* ===== TOP PRODUCT SECTION ===== */}
        <div style={{ display: "flex", gap: 36, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Gallery (right in RTL) */}
          <div style={{ flex: "1 1 380px", maxWidth: 400, order: 1 }}>
            <ProductGallery images={galleryImages} alt={product.title} />
          </div>

          {/* Config (center) */}
          <div style={{ flex: "1 1 380px", minWidth: 320, order: 2 }}>
            <BuyPanel
              options={product.options}
              buyLabel={product.buyLabel}
              delivery={product.delivery}
            />
          </div>

          {/* Trust column (left) */}
          <div
            style={{
              flex: "0 1 240px",
              minWidth: 220,
              order: 3,
              borderRight: "1px solid #ececec",
              paddingRight: 24,
            }}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: ACCENT }}>
              {product.trustTitle}
            </h3>
            <ul
              style={{
                listStyle: "none",
                margin: "0 0 22px",
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {product.trustPoints.map((pt, i) => (
                <li
                  key={i}
                  style={{ fontSize: 14, color: "#4a4a4a", display: "flex", gap: 6, alignItems: "flex-start" }}
                >
                  <span style={{ color: ACCENT, fontSize: 11, lineHeight: 1.5 }}>◀</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>

            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {badges.map((b, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    border: "1px solid #e6e6e6",
                    borderRadius: 3,
                    padding: "12px 4px 10px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ color: "#9a9a9a" }}>{b.icon}</span>
                  <span style={{ fontSize: 11, color: "#666", lineHeight: 1.25 }}>{b.label}</span>
                </div>
              ))}
            </div>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontSize: 14,
                color: "#3a3a3a",
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 32 32" fill="#25D366" aria-hidden="true">
                  <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.7 5.4 2 7.7L.5 31.5l8-2.1c2.2 1.2 4.8 1.9 7.5 1.9 8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5zm0 28c-2.4 0-4.7-.6-6.7-1.8l-.5-.3-4.7 1.2 1.3-4.6-.3-.5C3.6 20.3 3 18.2 3 16 3 8.8 8.8 3 16 3s13 5.8 13 13-5.8 12.5-13 12.5z" />
                  <path d="M23.4 19.2c-.4-.2-2.3-1.1-2.6-1.3-.4-.1-.6-.2-.9.2s-1 1.3-1.2 1.5c-.2.2-.4.3-.8.1s-1.6-.6-3-1.9c-1.1-1-1.9-2.2-2.1-2.6s0-.6.2-.8c.2-.2.4-.4.5-.6.2-.2.2-.4.4-.6.1-.3 0-.5 0-.7s-.9-2.1-1.2-2.9c-.3-.7-.6-.6-.9-.6h-.7c-.2 0-.6.1-.9.5s-1.2 1.2-1.2 2.9 1.2 3.4 1.4 3.6c.2.2 2.4 3.7 5.8 5.1.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.5.2-1.7-.1-.1-.3-.2-.7-.4z" />
                </svg>
              </span>
              {product.askLabel}
            </a>
          </div>
        </div>

        {/* ===== DESCRIPTION SECTION ===== */}
        <div style={{ marginTop: 64 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 25,
              fontWeight: 700,
              color: ACCENT,
              textAlign: "right",
              borderBottom: "1px solid #e2e2e2",
              paddingBottom: 10,
              position: "relative",
            }}
          >
            {product.descTitle}
            <span
              style={{
                position: "absolute",
                bottom: -1,
                right: 0,
                width: 150,
                height: 3,
                background: ACCENT,
              }}
            />
          </h2>

          <div style={{ display: "flex", gap: 48, alignItems: "flex-start", flexWrap: "wrap", marginTop: 24 }}>
            <div
              style={{
                flex: "1 1 540px",
                minWidth: 320,
                fontSize: 15,
                lineHeight: 1.95,
                color: "#4a4a4a",
                textAlign: "right",
              }}
            >
              {product.descParas.map((para, i) => (
                <p key={i} style={{ margin: "0 0 18px", whiteSpace: "pre-line" }}>
                  {para}
                </p>
              ))}
              <ProductDims />
            </div>

            {/* Interactive 3D shed + garden (CAD embed) */}
            <div style={{ flex: "0 1 340px", minWidth: 280 }}>
              <Product3D />
              <a
                href={TEL_URL}
                dir="ltr"
                style={{
                  display: "block",
                  textAlign: "center",
                  marginTop: 10,
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#2f2f2f",
                  textDecoration: "none",
                }}
              >
                ☎ {product.phone}
              </a>
            </div>
          </div>
        </div>
       </SizeProvider>
      </div>
    </div>
  );
}
