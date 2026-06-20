"use client";

import { useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { useSize } from "./size-context";
import { SIZES, productTitle } from "./sizes";

type Choice = { label: string; price: number | null };
type Group = { label: string; choices: Choice[] };

const ils = (n: number) => `₪ ${n.toLocaleString("he-IL")}`;
const ACCENT = "#2f8fd6";

const selectStyle: CSSProperties = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  background: "#f1f1f1",
  border: "1px solid #cfcfcf",
  borderRadius: 2,
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
  padding: "10px 12px",
  marginBottom: 10,
  border: "1px solid #cfcfcf",
  borderRadius: 3,
  fontFamily: "inherit",
  fontSize: 14,
  color: "#333",
};

function Chevron() {
  return (
    <span
      data-id="select-chevron"
      style={{
        position: "absolute",
        left: 9,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        color: "#888",
        fontSize: 11,
      }}
    >
      ▼
    </span>
  );
}

/**
 * Client-side config + buy panel. A size selector drives the base price and the
 * (reactive) title; delivery/floor dropdowns add surcharges; the total updates
 * live. "קנה עכשיו" opens an order-request modal that POSTs to /api/orders
 * (a lead, not a payment). Selected size is shared via SizeProvider so the
 * description's dimensions block stays in sync.
 */
export default function BuyPanel({
  options,
  buyLabel,
  delivery,
}: {
  options: Group[];
  buyLabel: string;
  delivery: string;
}) {
  const { sizeIndex, setSizeIndex } = useSize();
  const size = SIZES[sizeIndex];
  const base = size.price;
  const title = productTitle(size.label);

  const [sel, setSel] = useState<number[]>(() => options.map(() => 0));
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chosen = useMemo(
    () => options.map((g, i) => g.choices[sel[i]] ?? g.choices[0]),
    [options, sel],
  );
  const addons = chosen.reduce((s, c) => s + (c.price ?? 0), 0);
  const newTotal = base + addons;

  function setChoice(groupIdx: number, choiceIdx: number) {
    setSel((prev) => prev.map((v, i) => (i === groupIdx ? choiceIdx : v)));
  }

  function closeModal() {
    setOpen(false);
    window.setTimeout(() => {
      setOrderId(null);
      setError(null);
    }, 200);
  }

  async function submitOrder(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError("נא למלא שם וטלפון");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          notes,
          title,
          totalIls: newTotal,
          options: [
            { label: "גודל", choice: `${size.label} מטר`, price: base },
            ...options.map((g, i) => ({
              label: g.label,
              choice: chosen[i].label,
              price: chosen[i].price,
            })),
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "failed");
      setOrderId(data.orderId as string);
    } catch {
      setError("אירעה שגיאה. נסו שוב או חייגו אלינו.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1
        data-id="buy-panel-title"
        style={{
          margin: "0 0 22px",
          fontSize: 23,
          fontWeight: 700,
          color: ACCENT,
          textAlign: "center",
        }}
      >
        {title}
      </h1>

      {/* Size + add-on dropdowns — drive the live total */}
      <div data-id="config-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 22px" }}>
        <div data-id="size-field">
          <label data-id="size-label" style={{ display: "block", fontSize: 14, color: "#555", marginBottom: 5 }}>
            גודל:
          </label>
          <div data-id="size-select-wrap" style={{ position: "relative" }}>
            <select
              data-id="select-size"
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
            <label data-id={`option-label-${i}`} style={{ display: "block", fontSize: 14, color: "#555", marginBottom: 5 }}>
              {g.label}
            </label>
            <div data-id={`option-select-wrap-${i}`} style={{ position: "relative" }}>
              <select
                data-id={`option-select-${i}`}
                style={selectStyle}
                value={sel[i]}
                onChange={(e) => setChoice(i, Number(e.target.value))}
              >
                {g.choices.map((c, j) => (
                  <option key={j} data-id={`option-${i}-choice-${j}`} value={j}>
                    {c.price != null ? `${c.label} — ${ils(c.price)}` : c.label}
                  </option>
                ))}
              </select>
              <Chevron />
            </div>
          </div>
        ))}
      </div>

      {/* Buy + live price */}
      <div
        data-id="buy-row"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 26,
        }}
      >
        <button
          type="button"
          data-id="buy-now"
          onClick={() => setOpen(true)}
          style={{
            background: ACCENT,
            color: "#fff",
            border: "none",
            borderRadius: 3,
            padding: "14px 40px",
            fontFamily: "inherit",
            fontSize: 17,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {buyLabel}
        </button>
        <div data-id="price-wrap" style={{ textAlign: "left" }}>
          <div
            data-id="total-price"
            style={{ fontSize: 26, fontWeight: 700, color: "#2f2f2f" }}
            dir="ltr"
          >
            {ils(newTotal)}
          </div>
        </div>
      </div>

      <p data-id="delivery-note" style={{ margin: "22px 0 0", fontSize: 14, color: "#555" }}>{delivery}</p>

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
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              background: "#fff",
              borderRadius: 8,
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,.3)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {orderId ? (
              <div data-id="order-success" style={{ textAlign: "center" }}>
                <div
                  data-id="order-success-icon"
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: "50%",
                    background: "#e6f1fb",
                    color: ACCENT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px",
                    fontSize: 28,
                  }}
                >
                  ✓
                </div>
                <h3 data-id="order-success-title" style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "#2f2f2f" }}>
                  הבקשה התקבלה!
                </h3>
                <p data-id="order-success-text" style={{ margin: "0 0 6px", fontSize: 14, color: "#555" }}>
                  תודה, נחזור אליכם בהקדם לאישור ההזמנה ותיאום אספקה.
                </p>
                <p data-id="order-success-id" style={{ margin: "0 0 18px", fontSize: 12, color: "#999" }} dir="ltr">
                  מספר בקשה: {orderId}
                </p>
                <button
                  data-id="order-success-close"
                  type="button"
                  onClick={closeModal}
                  style={{
                    background: ACCENT,
                    color: "#fff",
                    border: "none",
                    borderRadius: 3,
                    padding: "10px 28px",
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  סגירה
                </button>
              </div>
            ) : (
              <>
                <h3 data-id="order-form-title" style={{ margin: "0 0 12px", fontSize: 19, fontWeight: 700, color: ACCENT }}>
                  {title}
                </h3>
                <div
                  data-id="order-summary"
                  style={{
                    borderBottom: "1px solid #eee",
                    paddingBottom: 12,
                    marginBottom: 14,
                    fontSize: 14,
                    color: "#555",
                  }}
                >
                  <div data-id="summary-row-size" style={{ display: "flex", justifyContent: "space-between" }}>
                    <span data-id="summary-size-label">גודל {size.label} מטר</span>
                    <span data-id="summary-size-price" dir="ltr">{ils(base)}</span>
                  </div>
                  {chosen.map(
                    (c, i) =>
                      c.price != null && (
                        <div key={i} data-id={`summary-row-${i}`} style={{ display: "flex", justifyContent: "space-between" }}>
                          <span data-id={`summary-choice-label-${i}`}>{c.label}</span>
                          <span data-id={`summary-choice-price-${i}`} dir="ltr">{ils(c.price)}</span>
                        </div>
                      ),
                  )}
                  <div
                    data-id="summary-total-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 8,
                      fontWeight: 700,
                      color: "#2f2f2f",
                    }}
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
                    style={inputStyle}
                  />
                  <input
                    data-id="order-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="טלפון *"
                    inputMode="tel"
                    style={inputStyle}
                  />
                  <textarea
                    data-id="order-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="הערות (אזור, גישה למשאית, מועד מועדף…)"
                    rows={3}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                  {error && (
                    <p data-id="order-error" style={{ color: "#c0392b", fontSize: 13, margin: "0 0 10px" }}>{error}</p>
                  )}
                  <p data-id="order-disclaimer" style={{ fontSize: 12, color: "#999", margin: "0 0 14px" }}>
                    זו בקשת הזמנה ואינה חיוב. לא נשמרים פרטי אשראי — נתאם איתכם תשלום ישירות.
                  </p>
                  <div data-id="order-actions" style={{ display: "flex", gap: 10 }}>
                    <button
                      type="submit"
                      data-id="order-submit"
                      disabled={submitting}
                      style={{
                        flex: 1,
                        background: ACCENT,
                        color: "#fff",
                        border: "none",
                        borderRadius: 3,
                        padding: "12px",
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: submitting ? "default" : "pointer",
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      {submitting ? "שולח…" : "שליחת בקשה"}
                    </button>
                    <button
                      data-id="order-cancel"
                      type="button"
                      onClick={closeModal}
                      style={{
                        background: "#f1f1f1",
                        color: "#555",
                        border: "1px solid #ddd",
                        borderRadius: 3,
                        padding: "12px 18px",
                        fontSize: 15,
                        cursor: "pointer",
                      }}
                    >
                      ביטול
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
