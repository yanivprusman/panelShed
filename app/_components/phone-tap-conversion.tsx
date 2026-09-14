"use client";

import { useEffect } from "react";
import { reportContact } from "@/lib/gtag";
import { TEL_URL } from "./contact";

/**
 * Counts a tap on the business phone number (header, footer, legal pages) as
 * the "panelShed Contact — phone tap" conversion. One document listener instead
 * of an onClick per link, so a phone link added to a new page is counted
 * without anyone wiring it.
 *
 * Matches TEL_URL exactly, not any tel: link: /admin/orders renders tel: links
 * to CUSTOMERS' numbers, and the owner calling a buyer must never count as an
 * ad conversion. WhatsApp links are deliberately not handled here — the header
 * and footer WhatsApp buttons carry a wa.me href but only open the message
 * chooser, so a page-wide rule would count opening the chooser as a lead. Those
 * fire reportLead from their own handlers when the hand-off really happens.
 */
export default function PhoneTapConversion() {
  useEffect(() => {
    // Capture phase, so the tap is recorded before any link handler runs.
    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (link?.getAttribute("href") === TEL_URL) reportContact();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
