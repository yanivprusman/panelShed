"use client";

import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { useSize } from "./size-context";
import {
  productTitle,
  floorPriceFor,
  deliveryInstallPriceFor,
  heightOf,
} from "./sizes";
import { sizeSummary, type OptionChoice as Choice } from "./planner";
import { DesignDetails } from "./design-details";
import { whatsappUrl } from "./contact";
import { WhatsAppIcon, CheckIcon } from "./icons";
import { reportLead } from "@/lib/gtag";

const ils = (n: number) => `₪ ${n.toLocaleString("he-IL")}`;
const ACCENT = "#2f8fd6";

/** Mirror of the server-side Israeli-mobile check so we fail fast before POSTing. */
const normalizePhone = (raw: string) => {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("972")) d = "0" + d.slice(3);
  return d;
};
const isValidMobile = (raw: string) => /^05\d{8}$/.test(normalizePhone(raw));

const selectStyle: CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 12px",
  background: "#f5f7f8",
  border: "1px solid #d8dde0",
  borderRadius: 7,
  fontFamily: "inherit",
  fontSize: 14,
  color: "#444",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 13px",
  marginBottom: 10,
  border: "1px solid #d8dde0",
  borderRadius: 7,
  fontFamily: "inherit",
  fontSize: 14,
  color: "#333",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#666",
  marginBottom: 6,
  fontWeight: 600,
};

const divider: CSSProperties = { height: 1, background: "#eee", margin: "20px 0" };

/** Small inline notice under the configurator (custom-size state, unavailable add-on). */
const noteStyle = (background: string, border: string, color: string): CSSProperties => ({
  marginTop: 14,
  padding: "10px 13px",
  background,
  border: `1px solid ${border}`,
  borderRadius: 8,
  fontSize: 13.5,
  lineHeight: 1.6,
  color,
});

// Trust badges along the bottom of the card (presentational, static).
const badges: { label: string; icon: ReactNode }[] = [
  {
    label: "תשלום מאובטח",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="1.5">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="6" y1="14" x2="11" y2="14" />
      </svg>
    ),
  },
  {
    label: "משלוחים מהירים",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="1.5">
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9a9a9a" strokeWidth="1.5">
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
];

function Chevron() {
  return (
    <span
      data-id="select-chevron"
      style={{
        position: "absolute",
        left: 11,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        color: "#8a8a8a",
        fontSize: 10,
      }}
    >
      ▼
    </span>
  );
}

/**
 * The full purchase card: title, live price, size buttons + add-on dropdowns,
 * buy button, delivery note, trust points/badges and an "ask on WhatsApp" link —
 * all in one bordered card (per the imported design).
 *
 * The size selector offers exactly two sheds, because that is what the shop
 * sells: the standard one (dimensions AND height spelled out — a shed is a
 * volume, and a buyer who only ever sees "2x2" is being told two thirds of the
 * product), or the one they design themselves in the planner. Two of anything
 * is a choice, not a list, so they are side-by-side buttons rather than a
 * dropdown: both prices are on screen without opening anything, and the second
 * option can't hide behind a closed menu. Choosing the custom one before
 * designing anything takes them to the planner and back.
 * Delivery/floor dropdowns add surcharges; the total updates live. "קנה עכשיו"
 * opens an order modal (name + mobile + optional email + notes) and hands off to
 * Grow's hosted payment page.
 *
 * All of the configurator's state lives in SizeProvider, so the description's
 * dimensions block, the 3D planner embed and the planner round trip stay in
 * sync with this card from one source.
 */
export default function BuyPanel({
  buyLabel,
  delivery,
  trustTitle,
  trustPoints,
  askLabel,
  showTrustBadges = true,
}: {
  buyLabel: string;
  delivery: string;
  trustTitle: string;
  trustPoints: string[];
  askLabel: string;
  showTrustBadges?: boolean;
}) {
  const {
    standard,
    custom,
    mode,
    setMode,
    size,
    customStatus,
    options,
    sel,
    setChoice,
    plannerUrl,
    designCode,
  } = useSize();
  const base = size.price;
  const title = productTitle(size.label);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email is optional, but an address that IS given has to prove it exists — we
  // mail it a code and the buyer types it back. The code is checked server-side
  // during checkout itself (one round trip, and the proof is consumed at the
  // only moment it matters); the client just carries the token.
  const [emailToken, setEmailToken] = useState<string | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [emailNote, setEmailNote] = useState<string | null>(null);

  const emailTouched = email.trim() !== "";

  /** Editing the address invalidates any code already sent to the old one. */
  function changeEmail(next: string) {
    setEmail(next);
    setEmailToken(null);
    setEmailCode("");
    setEmailNote(null);
  }

  /** Mail a verification code to whatever the buyer typed. */
  async function requestEmailCode() {
    setError(null);
    setEmailNote(null);
    setSendingCode(true);
    try {
      const res = await fetch("/api/checkout/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; token?: string; error?: string };
      if (data.ok && data.token) {
        setEmailToken(data.token);
        setEmailNote("שלחנו קוד בן 6 ספרות לכתובת. בדקו גם בספאם.");
      } else {
        setEmailToken(null);
        setEmailNote(
          data.error === "bad_email"
            ? "הכתובת אינה תקינה."
            : data.error === "no_such_domain"
              ? "לא קיים שרת דואר לכתובת הזו — בדקו את האיות."
              : data.error === "too_many_sends"
                ? "נשלחו כבר כמה קודים לכתובת הזו. נסו שוב בעוד כמה דקות."
                : "לא הצלחנו לשלוח את הקוד כרגע. אפשר להמשיך גם בלי אימייל — מחקו את השדה.",
        );
      }
    } catch {
      setEmailToken(null);
      setEmailNote("לא הצלחנו לשלוח את הקוד כרגע. אפשר להמשיך גם בלי אימייל — מחקו את השדה.");
    } finally {
      setSendingCode(false);
    }
  }

  // Some add-ons (pine-deck floor, delivery+install) are priced by footprint,
  // not flat — their choice carries priceFromSize and the real price is derived
  // from the selected size.
  //
  // `available` is NOT the same as "price is null": "ללא (איסוף עצמי)" is free
  // (null price, available), while הובלה+הרכבה above the top competitor-verified
  // tier has no price we can stand behind and is genuinely unavailable. Keeping
  // them apart is what stops an unpriceable add-on from being sold for ₪0. Floor
  // is a ₪/m² formula, so it holds for any footprint.
  const resolve = useCallback(
    (c: Choice): { price: number | null; available: boolean } => {
      if (c.priceFromSize === "floor") {
        return { price: floorPriceFor(size), available: true };
      }
      if (c.priceFromSize === "deliveryInstall") {
        const p = deliveryInstallPriceFor(size);
        return { price: p, available: p !== null };
      }
      return { price: c.price, available: true };
    },
    [size],
  );

  // A size change could in principle pull the floor out from under the current
  // selection, so the effective choice is DERIVED rather than synced: an
  // unavailable selection reads as that group's first choice — always the "ללא"
  // one. Derived, so there is no window in which the displayed selection and the
  // priced one disagree.
  //
  // Today nothing can actually be unavailable: CUSTOM_LIMITS.maxSqm is derived
  // from the top install tier, so the storefront only ever offers a footprint it
  // can price end to end. This guard is kept deliberately — it is what stops a
  // ₪0 add-on from being sold if that ceiling is ever raised past the verified
  // tiers.
  const effSel = useMemo(
    () => options.map((g, i) => {
      const idx = sel[i] ?? 0;
      const c = g.choices[idx];
      return c && resolve(c).available ? idx : 0;
    }),
    [options, sel, resolve],
  );

  const chosen = useMemo(
    () => options.map((g, i) => g.choices[effSel[i]] ?? g.choices[0]),
    [options, effSel],
  );
  const addons = chosen.reduce((s, c) => {
    const { price, available } = resolve(c);
    return s + (available ? (price ?? 0) : 0);
  }, 0);
  const newTotal = base + addons;

  const askWhatsappUrl = whatsappUrl("שלום, אשמח לקבל פרטים על " + title);

  /**
   * The size selector. Picking "custom" before anything has been designed is a
   * request to design it: we hand the visitor to the planner in this same tab,
   * carrying the whole configuration, and CAD's "order these dimensions" brings
   * both the footprint and the configuration back here.
   */
  function changeSize(next: string) {
    if (next === "custom" && !custom) {
      window.location.href = plannerUrl;
      return;
    }
    setMode(next === "custom" ? "custom" : "standard");
  }

  // Split across the button's two lines: what it is, then what it costs.
  const customTitle = custom ? "המידה שלכם" : "מידה מותאמת אישית";
  const customDetail = custom
    ? `${sizeSummary(custom)} — ${ils(custom.price)}`
    : customStatus.state === "loading"
      ? "מתמחרים…"
      : "לתכנון במתכנן ›";

  function closeModal() {
    setOpen(false);
    setLoading(false);
    window.setTimeout(() => setError(null), 200);
  }

  /**
   * Submit the order and charge online via Grow. Validates name + Israeli mobile
   * (fires the Lead conversion), then requires a valid email — Grow rejects a
   * payment page without one (427) and sends the receipt there — before POSTing
   * to /api/checkout, which opens a Grow payment process and returns its hosted
   * page URL; the browser is then redirected to Grow to pay. On any gateway
   * error, a clear message points the buyer to WhatsApp.
   */
  async function submitOrder(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().split(/\s+/).filter(Boolean).length < 2) {
      setError("נא למלא שם פרטי ושם משפחה");
      return;
    }
    if (!isValidMobile(phone)) {
      setError("נא למלא מספר טלפון נייד תקין (למשל 0501234567)");
      return;
    }
    // Starting checkout = a strong lead signal for Google Ads (no-op unless
    // NEXT_PUBLIC_GADS_LEAD_LABEL is set), weighted by the cart total. Fired on
    // name+phone so we still capture the lead even if the email step stops here.
    reportLead({ value: newTotal });

    // The email is optional. But a buyer who typed one must have proved it —
    // an address nobody can reach is worse than none, because it looks like a
    // way to contact them. Leaving the field empty is always a valid answer.
    if (emailTouched && (!emailToken || emailCode.trim().length !== 6)) {
      setError(
        emailToken
          ? "נא להזין את קוד האימות בן 6 הספרות שנשלח לאימייל (או למחוק את שדה האימייל)"
          : "נא לאמת את כתובת האימייל, או למחוק את השדה ולהמשיך בלעדיו",
      );
      return;
    }

    // Create the order + Grow payment process server-side, then hand the browser
    // off to Grow's hosted secure payment page. No fallback: if payments aren't
    // configured or the gateway errors, surface a clear message.
    setLoading(true);
    try {
      // A custom size carries its exact dimensions onto the order, so the build
      // is made to what the customer designed in the planner rather than to a
      // rounded label.
      const orderOptions = [
        {
          label: "גודל",
          choice: size.custom
            ? `${size.label} מטר (מידה מותאמת מהמתכנן: ${size.widthCm}×${size.depthCm}×${heightOf(size)} ס"מ)`
            : `${size.label} מטר`,
          price: base,
        },
        ...chosen.flatMap((c) => {
          const { price, available } = resolve(c);
          return available && price != null
            ? [{ label: "תוספת", choice: c.label, price }]
            : [];
        }),
      ];
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          emailToken: emailToken ?? "",
          emailCode: emailCode.trim(),
          notes: notes.trim(),
          title,
          totalIls: newTotal,
          options: orderOptions,
          // Which shed this is. The total above was computed from this design's
          // bill of materials, so an order that keeps the price and drops the
          // code records what was paid and not what was bought.
          designCode: designCode ?? undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        redirectUrl?: string;
        error?: string;
      };
      if (data.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl; // off to Grow
        return;
      }
      setLoading(false);
      setError(
        data.error === "payments_not_configured"
          ? "התשלום אינו זמין כרגע. נסו שוב מאוחר יותר או פנו אלינו בוואטסאפ."
          : data.error === "email_not_verified"
            ? "קוד האימות שגוי או פג תוקף. בקשו קוד חדש, או מחקו את שדה האימייל והמשיכו בלעדיו."
            : "אירעה שגיאה בתהליך התשלום. נסו שוב או פנו אלינו בוואטסאפ.",
      );
    } catch {
      setLoading(false);
      setError("אירעה שגיאה בחיבור. נסו שוב או פנו אלינו בוואטסאפ.");
    }
  }

  return (
    <div
      data-id="purchase-card"
      style={{
        border: "1px solid #e8e8e8",
        borderRadius: 12,
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,.05)",
        padding: "26px 26px 22px",
      }}
    >
      <h1
        data-id="buy-panel-title"
        style={{ margin: "0 0 12px", fontSize: 26, fontWeight: 800, color: ACCENT, lineHeight: 1.25 }}
      >
        {title}
      </h1>

      {/* Live total + tax note */}
      <div data-id="price-row" style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 20 }}>
        <span data-id="total-price" dir="ltr" style={{ fontSize: 34, fontWeight: 800, color: "#1a1a1a", lineHeight: 1 }}>
          {ils(newTotal)}
        </span>
        <span data-id="tax-note" style={{ fontSize: 14, color: "#8a8a8a" }}>כולל מע&quot;מ</span>
      </div>

      <div data-id="card-divider-1" style={{ ...divider, margin: "0 0 20px" }} />

      {/* Size buttons + add-on dropdowns — drive the live total */}
      <div data-id="config-grid" className="config-grid">
        <div data-id="size-field" className="config-size-field">
          <span data-id="size-label" id="size-label" style={labelStyle}>גודל</span>
          <div data-id="size-choice" className="size-choice" role="group" aria-labelledby="size-label">
            <button
              type="button"
              data-id="size-button-standard"
              className={`size-btn${mode === "standard" ? " is-selected" : ""}`}
              aria-pressed={mode === "standard"}
              onClick={() => changeSize("standard")}
            >
              <span className="size-btn-title">מידה סטנדרטית</span>
              <span className="size-btn-sub">{sizeSummary(standard)} — {ils(standard.price)}</span>
            </button>
            <button
              type="button"
              data-id="size-button-custom"
              className={`size-btn${mode === "custom" ? " is-selected" : ""}`}
              aria-pressed={mode === "custom"}
              onClick={() => changeSize("custom")}
            >
              <span className="size-btn-title">{customTitle}</span>
              <span className="size-btn-sub">{customDetail}</span>
            </button>
          </div>
          {/* The shed is a volume — height belongs on screen next to the
              footprint, not only in the description block far below. */}
          <p data-id="size-dims-note" style={{ margin: "7px 0 0", fontSize: 13, color: "#777" }}>
            {`רוחב ${size.widthCm} ס"מ · עומק ${size.depthCm} ס"מ · גובה ${heightOf(size)} ס"מ`}
          </p>
        </div>

        {options.map((g, i) => (
          <div key={i} data-id={`option-field-${i}`}>
            <label data-id={`option-label-${i}`} htmlFor={`config-option-${i}`} style={labelStyle}>{g.label}</label>
            <div data-id={`option-select-wrap-${i}`} style={{ position: "relative" }}>
              <select
                data-id={`option-select-${i}`}
                id={`config-option-${i}`}
                style={selectStyle}
                value={effSel[i]}
                onChange={(e) => setChoice(i, Number(e.target.value))}
              >
                {g.choices.map((c, j) => {
                  const { price, available } = resolve(c);
                  const label = !available
                    ? `${c.label} — לא זמין במידה זו`
                    : price != null
                      ? `${c.label} — ${ils(price)}`
                      : c.label;
                  return (
                    <option
                      key={j}
                      data-id={`option-${i}-choice-${j}`}
                      value={j}
                      disabled={!available}
                    >
                      {label}
                    </option>
                  );
                })}
              </select>
              <Chevron />
            </div>
          </div>
        ))}
      </div>

      {/* Round trip from the CAD planner: pricing state for a custom footprint,
          and the one add-on a custom footprint can outgrow. */}
      {customStatus.state === "loading" && (
        <div data-id="custom-size-loading" style={noteStyle("#f5f7f8", "#d8dde0", "#666")}>
          מתמחרים את המידות שתכננתם…
        </div>
      )}
      {customStatus.state === "error" && (
        <div data-id="custom-size-error" style={noteStyle("#fff6f6", "#f3d2d2", "#a33")}>
          {customStatus.message}{" "}
          <a
            data-id="custom-size-error-whatsapp"
            href={whatsappUrl("שלום, תכננתי מחסן במתכנן ואשמח לקבל הצעת מחיר למידות שלי.")}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: ACCENT, fontWeight: 700 }}
          >
            דברו איתנו בוואטסאפ
          </a>
        </div>
      )}
      {/* Outside the range we routinely sell. The shed is priced and buyable —
          this says what is unusual about it and that a person confirms it, in
          place of the refusal that used to hide the customer's own design. */}
      {size.custom && customStatus.state === "ready" && customStatus.warning && (
        <div data-id="custom-size-warning" style={noteStyle("#fff8e8", "#f0dcae", "#8a6100")}>
          <strong data-id="custom-size-warning-lead" style={{ display: "block", marginBottom: 3 }}>
            מידה חורגת מהסטנדרט
          </strong>
          {customStatus.warning}{" "}
          <a
            data-id="custom-size-warning-whatsapp"
            href={whatsappUrl(
              `שלום, תכננתי מחסן במידות ${size.widthCm}×${size.depthCm} ס"מ, גובה ${heightOf(size)} ס"מ, ואשמח לוודא שאפשר לייצר אותו.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#8a6100", fontWeight: 700 }}
          >
            דברו איתנו בוואטסאפ
          </a>
        </div>
      )}
      {size.custom && customStatus.state === "ready" && !customStatus.warning && (
        <div data-id="custom-size-note" style={noteStyle("#f2f8fd", "#cfe4f5", "#2a6a99")}>
          {`זו המידה שתכננתם במתכנן — ${size.widthCm}×${size.depthCm} ס"מ, גובה ${heightOf(size)} ס"מ. ` +
            `המחיר מחושב מרשימת החומרים המלאה של המבנה הזה. `}
          <a
            data-id="custom-size-edit-planner"
            href={plannerUrl}
            style={{ color: ACCENT, fontWeight: 700, textDecoration: "none" }}
          >
            שנו את המידה במתכנן ›
          </a>
        </div>
      )}

      {/* The simple settings stay exactly as they are above; everything else the
          customer chose in the planner — door, swing, handle, slope, channel —
          is one tap away and closed until he asks. Keyed by the shed being sold:
          switching between the catalogue one and his own starts a fresh panel,
          so it can never show one shed's settings under the other's price. */}
      <DesignDetails key={designCode ?? "none"} />

      {/* Primary lead CTA: one-tap WhatsApp with the configured product, no
          up-front payment. Fires the Google Ads Lead conversion on click so the
          campaign records + can optimize for the conversion actually happening
          on a high-ticket item. */}
      <a
        data-id="whatsapp-lead-cta"
        href={askWhatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => reportLead({ value: newTotal })}
        className="wa-btn"
        style={{
          width: "100%",
          boxSizing: "border-box",
          marginTop: 22,
          color: "#fff",
          borderRadius: 8,
          padding: 15,
          fontFamily: "inherit",
          fontSize: 18,
          fontWeight: 700,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <WhatsAppIcon size={22} color="#fff" />
        לייעוץ מהיר והזמנה בוואטסאפ
      </a>

      <button
        type="button"
        data-id="buy-now"
        className="buy-btn"
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          marginTop: 12,
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: 15,
          fontFamily: "inherit",
          fontSize: 18,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {buyLabel}
      </button>

      <p data-id="delivery-note" style={{ margin: "14px 0 0", fontSize: 13.5, color: "#777", lineHeight: 1.5 }}>
        {delivery}
      </p>

      <div data-id="card-divider-2" style={divider} />

      {/* Trust points */}
      <div data-id="trust-title" style={{ fontSize: 14, fontWeight: 700, color: ACCENT, marginBottom: 10 }}>
        {trustTitle}
      </div>
      <ul
        data-id="trust-points-list"
        style={{ listStyle: "none", margin: "0 0 18px", padding: 0, display: "flex", flexDirection: "column", gap: 9 }}
      >
        {trustPoints.map((pt, i) => (
          <li
            key={i}
            data-id={`trust-point-${i}`}
            style={{ fontSize: 14, color: "#4a4a4a", display: "flex", gap: 9, alignItems: "flex-start" }}
          >
            <CheckIcon size={18} />
            <span data-id={`trust-point-text-${i}`}>{pt}</span>
          </li>
        ))}
      </ul>

      {showTrustBadges && (
        <div data-id="badges-row" style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {badges.map((b, i) => (
            <div
              key={i}
              data-id={`badge-${i}`}
              style={{
                flex: 1,
                border: "1px solid #ededed",
                borderRadius: 8,
                padding: "12px 4px 10px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span data-id={`badge-icon-${i}`}>{b.icon}</span>
              <span data-id={`badge-label-${i}`} style={{ fontSize: 11, color: "#666", lineHeight: 1.25 }}>
                {b.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <a
        data-id="whatsapp-ask-link"
        href={askWhatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => reportLead({ value: newTotal })}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          color: "#3a3a3a",
          textDecoration: "none",
        }}
      >
        <WhatsAppIcon size={20} />
        {askLabel}
      </a>

      {/* Order-request modal */}
      {open && (
        <div
          data-id="order-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            data-id="order-modal-box"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              background: "#fff",
              borderRadius: 12,
              padding: 26,
              boxShadow: "0 20px 60px rgba(0,0,0,.3)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <>
                <h3 data-id="order-form-title" style={{ margin: "0 0 14px", fontSize: 19, fontWeight: 800, color: ACCENT }}>
                  {title}
                </h3>
                <div
                  data-id="order-summary"
                  style={{
                    borderBottom: "1px solid #eee",
                    paddingBottom: 12,
                    marginBottom: 16,
                    fontSize: 14,
                    color: "#555",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div data-id="summary-row-size" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span data-id="summary-size-label">{sizeSummary(size)}</span>
                    <span data-id="summary-size-price" dir="ltr">{ils(base)}</span>
                  </div>
                  {chosen.map((c, i) => {
                    const { price: p, available } = resolve(c);
                    return (
                      available &&
                      p != null && (
                        <div key={i} data-id={`summary-row-${i}`} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <span data-id={`summary-choice-label-${i}`}>{c.label}</span>
                          <span data-id={`summary-choice-price-${i}`} dir="ltr">{ils(p)}</span>
                        </div>
                      )
                    );
                  })}
                  <div
                    data-id="summary-total-row"
                    style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6, fontWeight: 800, color: "#2f2f2f", fontSize: 15 }}
                  >
                    <span data-id="summary-total-label">סה&quot;כ</span>
                    <span data-id="summary-total-price" dir="ltr">{ils(newTotal)}</span>
                  </div>
                </div>

                <form data-id="order-form" onSubmit={submitOrder}>
                    <input
                      data-id="order-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="שם מלא *"
                      aria-label="שם מלא"
                      aria-required="true"
                      style={inputStyle}
                    />
                    <input
                      data-id="order-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="טלפון נייד *"
                      aria-label="טלפון נייד"
                      aria-required="true"
                      inputMode="tel"
                      style={inputStyle}
                    />
                    <div data-id="order-email-block" style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          data-id="order-email"
                          value={email}
                          onChange={(e) => changeEmail(e.target.value)}
                          placeholder="אימייל (לא חובה — לקבלה)"
                          aria-label="אימייל (לא חובה)"
                          inputMode="email"
                          type="email"
                          style={{ ...inputStyle, marginBottom: 0 }}
                        />
                        {emailTouched && (
                          <button
                            type="button"
                            data-id="order-email-send-code"
                            onClick={requestEmailCode}
                            disabled={sendingCode}
                            style={{
                              flexShrink: 0,
                              background: "#fff",
                              color: ACCENT,
                              border: `1px solid ${ACCENT}`,
                              borderRadius: 7,
                              padding: "0 12px",
                              fontSize: 13,
                              fontWeight: 700,
                              fontFamily: "inherit",
                              cursor: sendingCode ? "not-allowed" : "pointer",
                              opacity: sendingCode ? 0.6 : 1,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {sendingCode ? "שולח…" : emailToken ? "שלחו שוב" : "שלחו קוד"}
                          </button>
                        )}
                      </div>
                      {emailToken && (
                        <input
                          data-id="order-email-code"
                          value={emailCode}
                          onChange={(e) =>
                            setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                          }
                          placeholder="קוד אימות בן 6 ספרות"
                          aria-label="קוד אימות"
                          inputMode="numeric"
                          dir="ltr"
                          style={{ ...inputStyle, marginTop: 8, marginBottom: 0, letterSpacing: 3 }}
                        />
                      )}
                      {emailNote && (
                        <p data-id="order-email-note" style={{ fontSize: 12, color: "#777", margin: "6px 0 0", lineHeight: 1.5 }}>
                          {emailNote}
                        </p>
                      )}
                    </div>
                    <textarea
                      data-id="order-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="הערות (אזור, גישה למשאית, מועד מועדף…)"
                      aria-label="הערות"
                      rows={3}
                      style={{ ...inputStyle, resize: "vertical" }}
                    />
                    {error && (
                      <p data-id="order-error" style={{ color: "#c0392b", fontSize: 13, margin: "0 0 10px" }}>{error}</p>
                    )}
                    <p data-id="order-disclaimer" style={{ fontSize: 12, color: "#999", margin: "0 0 14px", lineHeight: 1.5 }}>
                      התשלום מאובטח ומתבצע דרך Grow — כרטיס אשראי, ביט או Apple/Google&nbsp;Pay.
                    </p>
                    <div data-id="order-actions" style={{ display: "flex", gap: 10 }}>
                      <button
                        type="submit"
                        data-id="order-submit"
                        disabled={loading}
                        style={{
                          flex: 1,
                          background: ACCENT,
                          color: "#fff",
                          border: "none",
                          borderRadius: 7,
                          padding: 12,
                          fontSize: 16,
                          fontWeight: 700,
                          cursor: loading ? "not-allowed" : "pointer",
                          opacity: loading ? 0.7 : 1,
                          fontFamily: "inherit",
                        }}
                      >
                        {loading ? "מעביר לתשלום מאובטח…" : `לתשלום · ${ils(newTotal)}`}
                      </button>
                      <button
                        data-id="order-cancel"
                        type="button"
                        onClick={closeModal}
                        style={{
                          background: "#f1f1f1",
                          color: "#555",
                          border: "1px solid #ddd",
                          borderRadius: 7,
                          padding: "12px 18px",
                          fontSize: 15,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        ביטול
                      </button>
                    </div>
                  </form>
            </>
          </div>
        </div>
      )}
    </div>
  );
}
