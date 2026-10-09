"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function OwnerSignIn({ configured, signedIn }: { configured: boolean; signedIn: boolean }) {
  const [owner, setOwner] = useState(signedIn);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function signOut() {
    await fetch("/api/owner/session", { method: "DELETE" });
    setOwner(false);
  }

  const btn = {
    width: "100%",
    border: "none",
    borderRadius: 8,
    padding: 13,
    fontFamily: "inherit",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  } as const;

  return (
    <main data-id="owner-page" dir="rtl" style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <h1 data-id="owner-title" style={{ fontSize: 22, margin: "0 0 14px" }}>כניסת מנהל</h1>
        {!configured ? (
          <p data-id="owner-not-configured" style={{ color: "#777" }}>הכניסה אינה מוגדרת (חסר ADMIN_TOKEN).</p>
        ) : owner ? (
          <>
            <p data-id="owner-signed-in" style={{ color: "#1e8e4a", fontWeight: 600, margin: "0 0 16px" }}>
              מחובר ✓ — בדף המוצר יופיע כפתור &quot;הפקת הצעת מחיר&quot;.
            </p>
            <Link data-id="owner-back-to-shop" href="/" className="buy-btn" style={{ ...btn, display: "block", textAlign: "center", color: "#fff", textDecoration: "none", boxSizing: "border-box" }}>
              לדף המוצר
            </Link>
            <button type="button" data-id="owner-sign-out" onClick={signOut} className="share-btn" style={{ ...btn, marginTop: 10 }}>
              התנתקות
            </button>
          </>
        ) : (
          <form data-id="owner-sign-in-form" onSubmit={signIn}>
            <input
              data-id="owner-password"
              type="password"
              autoFocus
              autoComplete="current-password"
              placeholder="סיסמה"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #d5dadd", borderRadius: 7, fontFamily: "inherit", fontSize: 16 }}
            />
            {error && <p data-id="owner-error" style={{ color: "#b3261e", margin: "10px 0 0", fontSize: 14 }}>{error}</p>}
            <button
              type="submit"
              data-id="owner-sign-in"
              disabled={busy || !password}
              className="buy-btn"
              style={{ ...btn, color: "#fff", marginTop: 14, opacity: busy || !password ? 0.5 : 1, cursor: busy || !password ? "not-allowed" : "pointer" }}
            >
              כניסה
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
