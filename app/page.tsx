import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Assistant } from "next/font/google";
import ImagePlaceholder from "./_components/image-placeholder";
import ProductGallery from "./_components/product-gallery";
import BuyPanel from "./_components/buy-panel";

const galleryImages = [
  "/products/panel-shed-2x2.png",
  "/products/gallery-1.jpg",
  "/products/gallery-2.jpg",
  "/products/gallery-3.jpg",
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
  basePrice: 4150,
  comparePrice: 5500,
  delivery: "זמן אספקה: 21 ימי עסקים , קיימת אפשרות לאיסוף עצמי",
  trustTitle: "למה לקוחות קונים אצלנו:",
  trustPoints: [
    "אפשרות לעד 5 תשלומים ללא ריבית",
    "קנייה מאובטחת ושירות לקוחות מעולה",
  ],
  askLabel: "שאל אותנו על מוצר זה",
  descTitle: "תיאור המוצר",
  descParas: [
    'מחסן גינה מפאנל מבודד בעובי 5 ס"מ\nהמחסן חסין לפגעי מזג אוויר קיצוני, ומקנה רמה גבוהה של בידוד וגימור.\nמיוצר בארץ ועומד בסטנדרטים ובתקנים הגבוהים ביותר בעולם\nעמידות לאורך שנים רבות ללא צורך בתחזוקה כלל\nיכל לשמש כמחסן|משרד|חדר מגורים|חדר עבודה|קליניקה|ן ועוד...',
    'הפנל מורכב משתי שכבות של פח מגולוון צבוע בתנור בעובי חצי מ"מ ושכבת פוליסטירן מוקצף בעובי 50 מ"מ\nמסילות המחסן שעוטפות את כל הקירות וזוויות הפנים עשויות אלומיניום בצבע לבן מה שמקנה רמת גימור יוקרתית ואיכותית ועמידות ללא דופי,',
    'ההובלה מתייחסת לפריקה מישורית עד 15 מטר ממקום החנייה. ישנה תוספת עבור סבלות, מעבר לנאמר, במזומן ישירות למתקינים.\nהפאנל מבודד עשוי 2 שכבות של פח פלדה 0.5 מ"מ מגולוון וצבוע בתנור.\nבין שתי שכבות הפח קיימת שכבת פוליסטירן מוקצף שמבודד טרמית כ-12 מעלות מהחוץ.\nהמבנים שלנו מתאימים לאקלים הישראלי ועומדים בכל התקנים הנדרשים עפ"י החוק. ולכן ניתן להשתמש בהם כמחסן|משרד|חדר מגורים|חדר עבודה|קליניקה|ן ועוד...',
  ],
  dimsTitle: 'מידות המחסן:',
  dims: ['גובה: חד שיפועי 230\\220 ס"מ', "רוחב: 200 ס\"מ", "עומק: 200 ס\"מ"],
  phone: "09-7604499",
};

const ORANGE = "#cf4520";

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
        {/* ===== TOP PRODUCT SECTION ===== */}
        <div style={{ display: "flex", gap: 36, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Gallery (right in RTL) */}
          <div style={{ flex: "1 1 380px", maxWidth: 400, order: 1 }}>
            <ProductGallery images={galleryImages} alt={product.title} />
          </div>

          {/* Config (center) */}
          <div style={{ flex: "1 1 380px", minWidth: 320, order: 2 }}>
            <h1
              style={{
                margin: "0 0 22px",
                fontSize: 23,
                fontWeight: 700,
                color: ORANGE,
                textAlign: "center",
              }}
            >
              {product.title}
            </h1>

            <BuyPanel
              title={product.title}
              options={product.options}
              buyLabel={product.buyLabel}
              delivery={product.delivery}
              basePrice={product.basePrice}
              comparePrice={product.comparePrice}
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
            <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 700, color: ORANGE }}>
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
                  <span style={{ color: ORANGE, fontSize: 11, lineHeight: 1.5 }}>◀</span>
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
              href="#"
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
                  borderRadius: "50%",
                  border: "1px solid #bbb",
                  color: "#888",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                ?
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
              color: "#1aa897",
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
                background: ORANGE,
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
              <div style={{ marginTop: 22 }}>
                <div style={{ fontWeight: 700, textDecoration: "underline", marginBottom: 4 }}>
                  {product.dimsTitle}
                </div>
                {product.dims.map((d, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>
                    {d}
                  </div>
                ))}
              </div>
            </div>

            {/* Video */}
            <div style={{ flex: "0 1 340px", minWidth: 280 }}>
              <div style={{ position: "relative", background: "#000", borderRadius: 2, overflow: "hidden" }}>
                <ImagePlaceholder
                  caption="פוסטר וידאו"
                  style={{ display: "block", width: "100%", height: 430 }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 54,
                    height: 40,
                    background: "#fff",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    color: "#c0392b",
                    fontWeight: 700,
                  }}
                >
                  לוגו
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 62,
                    textAlign: "center",
                    fontSize: 30,
                    fontWeight: 800,
                    color: "#fff",
                    textShadow: "0 0 4px #000, 0 0 8px #000",
                  }}
                >
                  {product.phone}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 44,
                    background: "rgba(20,20,20,.78)",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "0 12px",
                    color: "#fff",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span style={{ fontSize: 13 }}>0:00 / 0:38</span>
                  <div
                    style={{
                      flex: 1,
                      height: 3,
                      background: "rgba(255,255,255,.35)",
                      borderRadius: 2,
                      margin: "0 4px",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
