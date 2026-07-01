"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { reportPurchase } from "@/lib/gtag";

const ACCENT = "#2f8fd6";
const ils = (n: number) => `₪ ${n.toLocaleString("he-IL")}`;

type Status = {
  paymentStatus: "pending" | "paid" | "failed";
  title?: string;
  totalIls?: number | null;
  cardSuffix?: string | null;
};

/**
 * Post-payment landing page. Grow redirects here after the hosted checkout, but
 * the authoritative "paid" flip happens in the async webhook — so we poll the
 * status endpoint for a few seconds until it resolves, rather than trusting the
 * redirect.
 */
export default function SuccessClient() {
  const orderId = useSearchParams().get("order") ?? "";
  const [status, setStatus] = useState<Status | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const conversionSent = useRef(false);

  // Fire the Google Ads Purchase conversion exactly once, when Grow's webhook
  // has flipped the order to `paid`. transaction_id (orderId) dedupes reloads.
  useEffect(() => {
    if (status?.paymentStatus === "paid" && !conversionSent.current) {
      conversionSent.current = true;
      reportPurchase({ orderId, value: status.totalIls });
    }
  }, [status?.paymentStatus, status?.totalIls, orderId]);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    let tries = 0;

    async function poll() {
      try {
        const res = await fetch(`/api/checkout/status?order=${encodeURIComponent(orderId)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as { ok: boolean } & Status;
        if (active && data.ok) {
          setStatus(data);
          if (data.paymentStatus === "paid" || data.paymentStatus === "failed") return;
        }
      } catch {
        /* keep polling */
      }
      tries += 1;
      if (tries >= 15) {
        if (active) setTimedOut(true);
        return;
      }
      if (active) window.setTimeout(poll, 1500);
    }
    poll();
    return () => {
      active = false;
    };
  }, [orderId]);

  const paid = status?.paymentStatus === "paid";
  const failed = status?.paymentStatus === "failed";
  const settling = !paid && !failed;

  return (
    <main
      data-id="checkout-success-page"
      dir="rtl"
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "inherit",
      }}
    >
      <div
        data-id="checkout-success-card"
        style={{
          width: "100%",
          maxWidth: 460,
          background: "#fff",
          border: "1px solid #e8e8e8",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,.05)",
          padding: 30,
          textAlign: "center",
        }}
      >
        <div
          data-id="checkout-success-icon"
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 32,
            background: failed ? "#fdecea" : "#e6f1fb",
            color: failed ? "#c0392b" : ACCENT,
          }}
        >
          {failed ? "✕" : paid ? "✓" : "…"}
        </div>

        {paid && (
          <>
            <h1 data-id="success-title" style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#2f2f2f" }}>
              התשלום התקבל!
            </h1>
            <p data-id="success-text" style={{ margin: "0 0 6px", fontSize: 14.5, color: "#555", lineHeight: 1.6 }}>
              תודה על ההזמנה{status?.title ? ` של ${status.title}` : ""}. נחזור אליכם לתיאום ייצור ואספקה.
            </p>
            {typeof status?.totalIls === "number" && (
              <p data-id="success-amount" style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#2f2f2f" }} dir="ltr">
                {ils(status.totalIls)}
                {status?.cardSuffix ? `  •  ****${status.cardSuffix}` : ""}
              </p>
            )}
            <p data-id="success-order-id" style={{ margin: "0 0 20px", fontSize: 12, color: "#999" }} dir="ltr">
              מספר הזמנה: {orderId}
            </p>
          </>
        )}

        {failed && (
          <>
            <h1 data-id="failed-title" style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#2f2f2f" }}>
              התשלום לא הושלם
            </h1>
            <p data-id="failed-text" style={{ margin: "0 0 20px", fontSize: 14.5, color: "#555", lineHeight: 1.6 }}>
              לא בוצע חיוב. אפשר לנסות שוב, או לחייג אלינו ונשמח לעזור.
            </p>
          </>
        )}

        {settling && (
          <>
            <h1 data-id="settling-title" style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800, color: "#2f2f2f" }}>
              {timedOut ? "מאמתים את התשלום" : "מאמתים את התשלום…"}
            </h1>
            <p data-id="settling-text" style={{ margin: "0 0 20px", fontSize: 14.5, color: "#555", lineHeight: 1.6 }}>
              {timedOut
                ? "קיבלנו את הבקשה. אם בוצע חיוב נעדכן אתכם בהקדם — אפשר גם לחייג אלינו לאישור."
                : "רק רגע, מסנכרנים מול חברת הסליקה."}
            </p>
            <p data-id="settling-order-id" style={{ margin: "0 0 20px", fontSize: 12, color: "#999" }} dir="ltr">
              מספר הזמנה: {orderId}
            </p>
          </>
        )}

        <Link
          data-id="success-back-home"
          href="/"
          style={{
            display: "inline-block",
            background: ACCENT,
            color: "#fff",
            borderRadius: 8,
            padding: "11px 28px",
            fontSize: 15,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          חזרה לדף הבית
        </Link>
      </div>
    </main>
  );
}
