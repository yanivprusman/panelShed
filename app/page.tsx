import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import Product3D from "./_components/product-3d";
import ProductGallery from "./_components/product-gallery";
import BuyPanel from "./_components/buy-panel";
import ProductDims from "./_components/product-dims";
import SiteHeader from "./_components/site-header";
import SiteFooter from "./_components/site-footer";
import { SizeProvider } from "./_components/size-context";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { SIZES } from "./_components/sizes";
import { BRAND, PHONE_DISPLAY, EMAIL } from "./_components/contact";
import FaqSection, { FAQ_ITEMS } from "./_components/faq";

const galleryImages = [
  "/products/lehamhasha.png",
  "/products/panel-shed-render.png",
];

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "מחסן גינה פאנל מבודד 2x2 מטר | פאנל-שד",
  description:
    "מחסן גינה מפאנל מבודד בעובי 5 ס\"מ — חסין לפגעי מזג אוויר, בידוד וגימור ברמה גבוהה, מיוצר בארץ.",
  alternates: { canonical: "/" },
};

// Structured data (schema.org) so Google can show rich results: the shed as a
// Product with an aggregate offer (cheapest size upward), plus the business.
const lowestPrice = Math.min(...SIZES.map((s) => s.price));
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Product",
      name: "מחסן גינה פאנל מבודד",
      image: [
        `${SITE_URL}/products/panel-shed-render.png`,
        `${SITE_URL}/products/lehamhasha.png`,
      ],
      description:
        'מחסן גינה מפאנל מבודד בעובי 5 ס"מ — חסין לפגעי מזג אוויר, בידוד וגימור ברמה גבוהה, מיוצר בישראל. משמש כמחסן, משרד, חדר עבודה ועוד.',
      brand: { "@type": "Brand", name: BRAND },
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "ILS",
        lowPrice: lowestPrice,
        offerCount: SIZES.length,
        availability: "https://schema.org/InStock",
        url: SITE_URL,
      },
    },
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      email: EMAIL,
      telephone: `+972${PHONE_DISPLAY.replace(/\D/g, "").replace(/^0/, "")}`,
      areaServed: "IL",
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

// ── Content (ported from the imported design's renderVals) ─────────────────
const product = {
  // LOCKED: exactly two configurator options — delivery (הובלה+הרכבה) and
  // floor (ריצפה). Do NOT re-add "תוספת שדרוג דלת" (door) or "חלונות ופתחי
  // אוורור" (windows/vents) — the user removed them and they regressed; see
  // AGENTS.md.
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
        // Floor price scales with the footprint (hamechola parity) — resolved
        // from the selected size's floorPrice in BuyPanel, not a flat number.
        { label: "במת דק מעץ אורן מלא", price: null, priceFromSize: "floor" as const },
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
};

const ACCENT = "#2f8fd6";

export default function Home() {
  return (
    <div
      data-id="Home"
      className={assistant.className}
      dir="rtl"
      style={{
        color: "#3a3a3a",
        background: "#ffffff",
        minHeight: "100vh",
        padding: "28px 24px 80px",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div data-id="page-container" style={{ maxWidth: 1180, margin: "0 auto" }}>
        <SiteHeader />

        <SizeProvider>
          <main id="main-content" tabIndex={-1} style={{ outline: "none" }}>
          {/* ===== TOP: GALLERY + PURCHASE CARD ===== */}
          <div
            data-id="top-product-section"
            style={{ display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap" }}
          >
            {/* Gallery (right in RTL) */}
            <div data-id="gallery-column" style={{ flex: "0 1 480px", maxWidth: 480, minWidth: 300, order: 1 }}>
              <ProductGallery images={galleryImages} alt="מחסן גינה פאנל מבודד" />
            </div>

            {/* Purchase card (left) */}
            <div data-id="buy-column" style={{ flex: "1 1 380px", minWidth: 320, order: 2 }}>
              <BuyPanel
                options={product.options}
                buyLabel={product.buyLabel}
                delivery={product.delivery}
                trustTitle={product.trustTitle}
                trustPoints={product.trustPoints}
                askLabel={product.askLabel}
                showTrustBadges
              />
            </div>
          </div>

          {/* ===== DESCRIPTION ===== */}
          <div data-id="description-section" style={{ marginTop: 64 }}>
            <h2
              data-id="description-title"
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
              {product.descTitle}
              <span
                data-id="description-title-line"
                style={{ position: "absolute", bottom: 0, right: 0, width: "50%", height: 1, background: "#e2e2e2" }}
              />
              <span
                data-id="description-title-underline"
                style={{ position: "absolute", bottom: -1, right: 0, width: 150, height: 3, background: ACCENT, borderRadius: 2 }}
              />
            </h2>

            <div
              data-id="description-body-row"
              style={{ display: "flex", gap: 44, alignItems: "flex-start", flexWrap: "wrap", marginTop: 24 }}
            >
              <div
                data-id="description-text-column"
                style={{ flex: "1 1 520px", minWidth: 300, fontSize: 16, lineHeight: 1.95, color: "#4a4a4a", textAlign: "right" }}
              >
                {product.descParas.map((para, i) => (
                  <p key={i} data-id={`desc-para-${i}`} style={{ margin: "0 0 18px", whiteSpace: "pre-line" }}>
                    {para}
                  </p>
                ))}
                <ProductDims />
              </div>

              {/* Interactive 3D shed planner (CAD embed) */}
              <div data-id="product-3d-column" className="product-3d-column" style={{ flex: "0 1 460px", minWidth: 300 }}>
                <Product3D />
              </div>
            </div>
          </div>

          {/* ===== FAQ ===== */}
          <FaqSection />
          </main>
        </SizeProvider>

        <SiteFooter />
      </div>
    </div>
  );
}
