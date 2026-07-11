"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { useSize } from "./size-context";
import { SIZES, productTitle, floorPriceFor, deliveryInstallPriceFor } from "./sizes";
import { whatsappUrl } from "./contact";
import { WhatsAppIcon, CheckIcon } from "./icons";
import { reportLead } from "@/lib/gtag";

type Choice = {
  label: string;
  price: number | null;
  priceFromSize?: "floor" | "deliveryInstall";
};
type Group = { label: string; choices: Choice[] };

const ils = (n: number) => `₪ ${n.toLocaleString("he-IL")}`;
const ACCENT = "#2f8fd6";

/** Mirror of the server-side Israeli-mobile check so we fail fast before POSTing. */
const normalizePhone = (raw: string) => {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("972")) d = "0" + d.slice(3);
  return d;
};
const isValidMobile = (raw: string) => /^05\d{8}$/.test(normalizePhone(raw));
/** Grow requires a valid email on the payment page (blank → 427), so it's
 *  mandatory at checkout — it's also where Grow sends the receipt. */
const isValidEmail = (raw: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());

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
 * The full purchase card: title, live price, size + add-on dropdowns, buy
 * button, delivery note, trust points/badges and an "ask on WhatsApp" link —
 * all in one bordered card (per the imported design). A size selector drives
 * the base price and reactive title; delivery/floor dropdowns add surcharges;
 * the total updates live. "קנה עכשיו" opens an order modal (name + mobile +
 * optional email + notes). While the site is under construction and online
 * payment (Grow) isn't wired up yet, submitting doesn't charge — it switches to
 * a confirmation view explaining payment is collected only after the job is
 * done, and offers a WhatsApp button pre-filled with the full order so the
 * buyer can hand it off in one tap. Selected size is shared via SizeProvider so
 * the description's dimensions block stays in sync.
 */
export default function BuyPanel({
  options,
  buyLabel,
  delivery,
  trustTitle,
  trustPoints,
  askLabel,
  showTrustBadges = true,
}: {
  options: Group[];
  buyLabel: string;
  delivery: string;
  trustTitle: string;
  trustPoints: string[];
  askLabel: string;
  showTrustBadges?: boolean;
}) {
  const { sizeIndex, setSizeIndex } = useSize();
  const size = SIZES[sizeIndex];
  const base = size.price;
  const title = productTitle(size.label);

  const [sel, setSel] = useState<number[]>(() => options.map(() => 0));
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Some add-ons (pine-deck floor, delivery+install) are priced by footprint,
  // not flat — their choice carries priceFromSize and the real price is
  // derived from the selected size.
  const effPrice = (c: Choice): number | null =>
    c.priceFromSize === "floor"
      ? floorPriceFor(size)
      : c.priceFromSize === "deliveryInstall"
        ? deliveryInstallPriceFor(size)
        : c.price;

  const chosen = useMemo(
    () => options.map((g, i) => g.choices[sel[i]] ?? g.choices[0]),
    [options, sel],
  );
  const addons = chosen.reduce((s, c) => s + (effPrice(c) ?? 0), 0);
  const newTotal = base + addons;

  const askWhatsappUrl = whatsappUrl("שלום, אשמח לקבל פרטים על " + title);

  function setChoice(groupIdx: number, choiceIdx: number) {
    setSel((prev) => prev.map((v, i) => (i === groupIdx ? choiceIdx : v)));
  }

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

    // Grow rejects a payment page with a blank/invalid email (427), so it's
    // required to proceed to payment — and it's where the receipt is sent.
    if (!isValidEmail(email)) {
      setError("נא למלא כתובת אימייל תקינה — לשליחת הקבלה");
      return;
    }

    // Create the order + Grow payment process server-side, then hand the browser
    // off to Grow's hosted secure payment page. No fallback: if payments aren't
    // configured or the gateway errors, surface a clear message.
    setLoading(true);
    try {
      const orderOptions = [
        { label: "גודל", choice: `${size.label} מטר`, price: base },
        ...chosen.flatMap((c) => {
          const p = effPrice(c);
          return p != null ? [{ label: "תוספת", choice: c.label, price: p }] : [];
        }),
      ];
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          notes: notes.trim(),
          title,
          totalIls: newTotal,
          options: orderOptions,
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

      {/* Size + add-on dropdowns — drive the live total */}
      <div data-id="config-grid" className="config-grid">
        <div data-id="size-field">
          <label data-id="size-label" htmlFor="config-size" style={labelStyle}>גודל</label>
          <div data-id="size-select-wrap" style={{ position: "relative" }}>
            <select
              data-id="select-size"
              id="config-size"
              style={selectStyle}
              value={sizeIndex}
              onChange={(e) => setSizeIndex(Number(e.target.value))}
            >
              {SIZES.map((s, j) => (
                <option key={j} data-id={`size-option-${j}`} value={j}>
                  {s.label} מטר — {ils(s.price)}
                </option>
              ))}
            </select>
            <Chevron />
          </div>
        </div>

        {options.map((g, i) => (
          <div key={i} data-id={`option-field-${i}`}>
            <label data-id={`option-label-${i}`} htmlFor={`config-option-${i}`} style={labelStyle}>{g.label}</label>
            <div data-id={`option-select-wrap-${i}`} style={{ position: "relative" }}>
              <select
                data-id={`option-select-${i}`}
                id={`config-option-${i}`}
                style={selectStyle}
                value={sel[i]}
                onChange={(e) => setChoice(i, Number(e.target.value))}
              >
                {g.choices.map((c, j) => {
                  const p = effPrice(c);
                  return (
                    <option key={j} data-id={`option-${i}-choice-${j}`} value={j}>
                      {p != null ? `${c.label} — ${ils(p)}` : c.label}
                    </option>
                  );
                })}
              </select>
              <Chevron />
            </div>
          </div>
        ))}
      </div>

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
                    <span data-id="summary-size-label">גודל {size.label} מטר</span>
                    <span data-id="summary-size-price" dir="ltr">{ils(base)}</span>
                  </div>
                  {chosen.map((c, i) => {
                    const p = effPrice(c);
                    return (
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
                    <input
                      data-id="order-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="אימייל (לקבלה) *"
                      aria-label="אימייל"
                      aria-required="true"
                      inputMode="email"
                      type="email"
                      style={inputStyle}
                    />
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
