"use client";

/**
 * Tracked WhatsApp lead CTAs. For a high-ticket product (an insulated-panel
 * shed, ₪4k–8k) cold search visitors won't commit to an online ₪8k charge on
 * the first visit — the realistic conversion is a *lead*: a one-tap WhatsApp
 * message with no payment commitment. Every entry point below fires the Google
 * Ads Lead conversion on click (no-op unless NEXT_PUBLIC_GADS_LEAD_LABEL is set;
 * the Lead action is count-"One", so firing from several buttons never inflates
 * the count) so the campaign can finally record + optimize for conversions.
 *
 * These are client components because they attach onClick handlers; the header
 * and page shell that use them stay server components.
 */

import { GENERIC_WHATSAPP_URL } from "./contact";
import { WhatsAppIcon } from "./icons";
import { reportLead } from "@/lib/gtag";

/** The header's WhatsApp link — same look as before, now fires the Lead event. */
export function HeaderWhatsApp() {
  return (
    <a
      data-id="header-whatsapp"
      href={GENERIC_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="וואטסאפ"
      onClick={() => reportLead()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        textDecoration: "none",
        color: "#2f2f2f",
        fontWeight: 700,
        fontSize: 15,
      }}
    >
      <WhatsAppIcon size={20} />
      וואטסאפ
    </a>
  );
}

/**
 * Persistent floating WhatsApp button. Fixed bottom-LEFT (physical) so it never
 * collides with the feedback-lib widget (bottom-right); the Next.js dev badge
 * that shares the bottom-left in dev is gone in prod. zIndex sits below the
 * order modal (100). The realistic warm-lead catcher for mobile ad traffic.
 */
export function FloatingWhatsApp() {
  return (
    <a
      data-id="floating-whatsapp"
      href={GENERIC_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="דברו איתנו בוואטסאפ"
      onClick={() => reportLead()}
      className="wa-float"
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        zIndex: 90,
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        background: "#25D366",
        color: "#fff",
        fontFamily: "inherit",
        fontWeight: 700,
        fontSize: 15,
        textDecoration: "none",
        padding: "12px 18px",
        borderRadius: 999,
        boxShadow: "0 6px 20px rgba(37,211,102,.45)",
      }}
    >
      <WhatsAppIcon size={22} color="#fff" />
      <span data-id="floating-whatsapp-label">דברו איתנו</span>
    </a>
  );
}
