"use client";

/**
 * The generic WhatsApp entry points — header, footer, floating button.
 *
 * All three used to be plain links to wa.me with one fixed sentence in them,
 * and that sentence is what arrived: no size, no location, no link back here.
 * They now open the message chooser instead (./whatsapp-chooser.tsx), which
 * offers the shed on screen plus the three questions people actually write in
 * with, and pre-fills a message worth answering.
 *
 * They stay <a href={GENERIC_WHATSAPP_URL}> underneath. The click is
 * intercepted, but a middle-click, a "open in new tab", or a browser running
 * without our script still reaches WhatsApp — with the old sentence, which now
 * at least carries the address of the shop. The sheet is an improvement layered
 * over a working link, not a replacement for one.
 *
 * The Google Ads Lead conversion has moved WITH the intent: it fires when a
 * message is actually picked (see the chooser), not when the sheet opens.
 */

import { GENERIC_WHATSAPP_URL } from "./contact";
import { WhatsAppIcon } from "./icons";
import { useWhatsAppChooser } from "./whatsapp-chooser";

/** Click handler shared by all three: open the sheet instead of navigating. */
function useOpenChooser() {
  const { open } = useWhatsAppChooser();
  return (e: React.MouseEvent) => {
    // Let a deliberate new-tab/new-window click through to the plain wa.me link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    open();
  };
}

/** The header's WhatsApp link. */
export function HeaderWhatsApp() {
  const openChooser = useOpenChooser();
  return (
    <a
      data-id="header-whatsapp"
      href={GENERIC_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="וואטסאפ"
      aria-haspopup="dialog"
      onClick={openChooser}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        textDecoration: "none",
        color: "#2f2f2f",
        fontWeight: 700,
        fontSize: 15,
        cursor: "pointer",
      }}
    >
      <WhatsAppIcon size={20} />
      וואטסאפ
    </a>
  );
}

/** The footer's WhatsApp link. */
export function FooterWhatsApp() {
  const openChooser = useOpenChooser();
  return (
    <a
      data-id="footer-whatsapp"
      href={GENERIC_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="וואטסאפ"
      aria-haspopup="dialog"
      onClick={openChooser}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        color: "#3a3a3a",
        fontWeight: 600,
        fontSize: 14,
        textDecoration: "none",
        cursor: "pointer",
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
  const openChooser = useOpenChooser();
  return (
    <a
      data-id="floating-whatsapp"
      href={GENERIC_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="דברו איתנו בוואטסאפ"
      aria-haspopup="dialog"
      onClick={openChooser}
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
        cursor: "pointer",
      }}
    >
      <WhatsAppIcon size={22} color="#fff" />
      <span data-id="floating-whatsapp-label">דברו איתנו</span>
    </a>
  );
}
