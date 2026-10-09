"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useConfiguredOrder, ils } from "./configured-order";

/**
 * "הפקת הצעת מחיר" — the owner's button, on the card where the order was just
 * configured.
 *
 * Visible to everyone, usable only with the password: the owner configures a
 * shed WITH the customer and must be able to quote it on the spot, without a
 * detour to a sign-in page in another tab. The first tap on a device asks for
 * the ADMIN_TOKEN password inside the same dialog; the browser then stays
 * signed in (half a year), so later taps go straight to the form. A customer who
 * taps it meets a password field and nothing else — every quote is still priced
 * and authorised by the server. One tap opens a form for the customer's details; the
 * server prices the configuration on screen, numbers and stores the quote, and
 * hands back a PDF. On a phone the PDF goes straight to the share sheet, so it
 * can be sent through whatever app the owner chooses; elsewhere it downloads.
 */

const field: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #d5dadd",
  borderRadius: 7,
  fontFamily: "inherit",
  fontSize: 15,
  background: "#fff",
};
const label: CSSProperties = { display: "block", fontSize: 13.5, fontWeight: 600, color: "#555", margin: "12px 0 5px" };
const btn: CSSProperties = {
  width: "100%",
  border: "none",
  borderRadius: 8,
  padding: 13,
  fontFamily: "inherit",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

type Result = { file: File; number: string };

export default function OwnerQuote() {
  const { orderRef, total, title } = useConfiguredOrder();
  /** null = not known yet; the dialog waits for the answer before asking. */
  const [owner, setOwner] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/owner/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { owner?: boolean }) => live && setOwner(!!d.owner))
      // Unknown means "ask": the server still decides on every quote.
      .catch(() => live && setOwner(false));
    return () => {
      live = false;
    };
  }, []);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/owner/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setOwner(true);
        setPassword("");
      } else {
        setError(res.status === 401 ? "סיסמה שגויה" : `הכניסה נכשלה (${res.status})`);
      }
    } catch {
      setError("אין חיבור לשרת");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setResult(null);
    setError(null);
  }

  async function generate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("נא למלא את שם הלקוח");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orderRef,
          claimedTotalIls: total,
          customer: { name, phone, email, address },
          notes,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        if (d.error === "not_owner") {
          // Signed out since the dialog opened (password rotated, cookie
          // cleared): ask again, keeping everything already typed.
          setOwner(false);
          setError("נדרשת סיסמה");
          return;
        }
        setError(d.message ?? `הפקת ההצעה נכשלה (${d.error ?? res.status})`);
        return;
      }
      const number = res.headers.get("X-Quote-Number") ?? "";
      const blob = await res.blob();
      const safeName = name.trim().replace(/[\\/:*?"<>|]+/g, " ");
      const file = new File([blob], `הצעת מחיר ${number} - ${safeName}.pdf`, { type: "application/pdf" });
      setResult({ file, number });
    } catch {
      setError("אין חיבור לשרת");
    } finally {
      setBusy(false);
    }
  }

  const canShare =
    !!result && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [result.file] });

  async function share() {
    if (!result) return;
    try {
      await navigator.share({ files: [result.file], title: result.file.name });
    } catch (e) {
      // The owner closing the share sheet is not an error worth showing.
      if ((e as DOMException).name !== "AbortError") setError("השיתוף נכשל — נסו להוריד את הקובץ");
    }
  }

  function download() {
    if (!result) return;
    const url = URL.createObjectURL(result.file);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <>
      <button
        type="button"
        data-id="owner-quote-open"
        className="share-btn"
        onClick={() => setOpen(true)}
        style={{ ...btn, border: "1px solid #d8dde0", marginTop: 10, fontSize: 15, fontWeight: 600, padding: 12 }}
      >
        הפקת הצעת מחיר (PDF)
      </button>

      {open && (
        <div
          data-id="owner-quote-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="הצעת מחיר"
          onClick={close}
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
            data-id="owner-quote-box"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 12,
              padding: "20px 20px 22px",
              boxSizing: "border-box",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 data-id="owner-quote-title" style={{ margin: 0, fontSize: 19 }}>הצעת מחיר</h2>
              <button
                type="button"
                data-id="owner-quote-close"
                onClick={close}
                aria-label="סגירה"
                className="share-btn"
                style={{ border: "none", fontSize: 22, lineHeight: 1, padding: "2px 8px", borderRadius: 6, cursor: "pointer" }}
              >
                ×
              </button>
            </div>
            <p data-id="owner-quote-summary" style={{ margin: "6px 0 0", fontSize: 14, color: "#666" }}>
              {title} — <strong style={{ color: "#2a2a2a" }}>{ils(total)}</strong>{" "}כולל מע&quot;מ
            </p>

            {owner === null ? (
              <p data-id="owner-quote-checking" style={{ margin: "18px 0 0", color: "#777" }}>רגע…</p>
            ) : !owner ? (
              <form data-id="owner-quote-sign-in" onSubmit={signIn}>
                <label style={label} htmlFor="oq-password">סיסמת מנהל</label>
                <input
                  id="oq-password"
                  data-id="owner-quote-password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  style={field}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {error && (
                  <p data-id="owner-quote-sign-in-error" style={{ margin: "12px 0 0", color: "#b3261e", fontSize: 14 }}>{error}</p>
                )}
                <button
                  type="submit"
                  data-id="owner-quote-sign-in-submit"
                  className="buy-btn"
                  disabled={busy || !password}
                  style={{ ...btn, color: "#fff", marginTop: 16, opacity: busy || !password ? 0.5 : 1, cursor: busy || !password ? "not-allowed" : "pointer" }}
                >
                  המשך
                </button>
              </form>
            ) : result ? (
              <div data-id="owner-quote-done" style={{ marginTop: 18 }}>
                <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: "#1e8e4a" }}>
                  הצעה מס&apos; {result.number} הופקה ✓
                </p>
                {canShare && (
                  <button
                    type="button"
                    data-id="owner-quote-share"
                    className="buy-btn"
                    onClick={share}
                    style={{ ...btn, color: "#fff", marginBottom: 10 }}
                  >
                    שליחת ה-PDF
                  </button>
                )}
                <button
                  type="button"
                  data-id="owner-quote-download"
                  className={canShare ? "share-btn" : "buy-btn"}
                  onClick={download}
                  style={{ ...btn, ...(canShare ? {} : { color: "#fff" }) }}
                >
                  הורדת ה-PDF
                </button>
              </div>
            ) : (
              <form data-id="owner-quote-form" onSubmit={generate}>
                <label style={label} htmlFor="oq-name">שם הלקוח *</label>
                <input id="oq-name" data-id="owner-quote-name" style={field} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                <label style={label} htmlFor="oq-phone">טלפון</label>
                <input id="oq-phone" data-id="owner-quote-phone" style={field} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" />
                <label style={label} htmlFor="oq-email">דוא&quot;ל</label>
                <input id="oq-email" data-id="owner-quote-email" style={field} value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" dir="ltr" />
                <label style={label} htmlFor="oq-address">כתובת התקנה</label>
                <input id="oq-address" data-id="owner-quote-address" style={field} value={address} onChange={(e) => setAddress(e.target.value)} />
                <label style={label} htmlFor="oq-notes">הערות להצעה</label>
                <textarea id="oq-notes" data-id="owner-quote-notes" style={{ ...field, minHeight: 70, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
                {error && (
                  <p data-id="owner-quote-error" style={{ margin: "12px 0 0", color: "#b3261e", fontSize: 14 }}>{error}</p>
                )}
                <button
                  type="submit"
                  data-id="owner-quote-generate"
                  className="buy-btn"
                  disabled={busy}
                  style={{ ...btn, color: "#fff", marginTop: 16, opacity: busy ? 0.5 : 1, cursor: busy ? "not-allowed" : "pointer" }}
                >
                  {busy ? "מפיק PDF…" : "הפקת הצעת מחיר"}
                </button>
              </form>
            )}
            {result && error && (
              <p data-id="owner-quote-share-error" style={{ margin: "12px 0 0", color: "#b3261e", fontSize: 14 }}>{error}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
