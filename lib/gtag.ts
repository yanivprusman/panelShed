/**
 * Google Ads conversion tracking helpers.
 *
 * All of this is INERT until you set the env vars below (per-business, from the
 * Google Ads UI → Tools → Conversions). While blank, the global tag never loads
 * and the report* calls are no-ops — nothing silently degrades. NEXT_PUBLIC_*
 * so the conversion id/labels are available in the browser (they are not secret;
 * they ship in the page source of every gtag-instrumented site).
 *
 *   NEXT_PUBLIC_GOOGLE_ADS_ID       AW-XXXXXXXXXX   (the Google Ads account tag)
 *   NEXT_PUBLIC_GADS_PURCHASE_LABEL <label>         (conversion action: Purchase)
 *   NEXT_PUBLIC_GADS_LEAD_LABEL     <label>         (conversion action: Lead)
 *
 * send_to is `${AW-ID}/${label}` — Google Ads shows both when you create the
 * conversion action ("Install the tag yourself" → the value after the slash).
 */

export const GADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() ?? "";
export const GADS_PURCHASE_LABEL = process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL?.trim() ?? "";
export const GADS_LEAD_LABEL = process.env.NEXT_PUBLIC_GADS_LEAD_LABEL?.trim() ?? "";

type Gtag = (...args: unknown[]) => void;

function getGtag(): Gtag | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { gtag?: Gtag };
  return typeof w.gtag === "function" ? w.gtag : null;
}

/**
 * Fire the Purchase conversion once Grow confirms a payment as `paid`.
 * `orderId` is passed as `transaction_id` so Google dedupes it if the buyer
 * reloads the success page. `value` is the charged total in ILS.
 */
export function reportPurchase(opts: { orderId: string; value?: number | null }): void {
  const gtag = getGtag();
  if (!gtag || !GADS_ID || !GADS_PURCHASE_LABEL) return;
  gtag("event", "conversion", {
    send_to: `${GADS_ID}/${GADS_PURCHASE_LABEL}`,
    transaction_id: opts.orderId,
    ...(opts.value != null ? { value: opts.value, currency: "ILS" } : {}),
  });
}

/**
 * Fire the Lead conversion when a buyer submits valid contact details (name +
 * Israeli mobile) in the buy form. This is the real conversion happening today
 * while online payment is under construction and orders hand off to WhatsApp.
 * `value` is the configured order total, so smart bidding can weight bigger
 * carts higher.
 */
export function reportLead(opts: { value?: number | null } = {}): void {
  const gtag = getGtag();
  if (!gtag || !GADS_ID || !GADS_LEAD_LABEL) return;
  gtag("event", "conversion", {
    send_to: `${GADS_ID}/${GADS_LEAD_LABEL}`,
    ...(opts.value != null ? { value: opts.value, currency: "ILS" } : {}),
  });
}
