/**
 * Google Ads conversion tracking helpers.
 *
 * The account id and conversion labels are COMMITTED here, not read from the
 * environment. They used to be NEXT_PUBLIC_* vars in each machine's gitignored
 * .env.local — the same setup that silently kept snapling's tag switched off
 * for its whole first ad campaign (found 2026-09-14): a missing file raised no
 * error, the tag just never loaded. panelShed's were set on both prod machines,
 * but a lost file or a new prod machine would have failed the same silent way.
 * They are public (they ship in every page's source), so a deploy carries them.
 *
 * Google Ads account 389-718-3064, conversion actions:
 *   7669345185  "panelShed Purchase"             counted every time
 *   7669345188  "panelShed Lead"                 once per ad click
 *   7766160649  "panelShed Contact — phone tap"  once per ad click (2026-09-14)
 */

export const GADS_ID = "AW-18290977259";
export const GADS_PURCHASE_SEND_TO = `${GADS_ID}/aHICCKHXg8kcEOvT6JFE`;
export const GADS_LEAD_SEND_TO = `${GADS_ID}/ROFRCKTXg8kcEOvT6JFE`;
export const GADS_CONTACT_SEND_TO = `${GADS_ID}/OvgcCInqmPccEOvT6JFE`;

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
  if (!gtag) return;
  gtag("event", "conversion", {
    send_to: GADS_PURCHASE_SEND_TO,
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
  if (!gtag) return;
  gtag("event", "conversion", {
    send_to: GADS_LEAD_SEND_TO,
    ...(opts.value != null ? { value: opts.value, currency: "ILS" } : {}),
  });
}

/**
 * Fire the Contact conversion when a visitor taps the business phone number —
 * a buyer who calls straight from an ad never reaches the form or WhatsApp.
 * Its own conversion action rather than Lead, so the lead numbers stay
 * comparable with everything counted before. transport_type "beacon" so the
 * hit survives the dialer taking over the screen.
 */
export function reportContact(): void {
  const gtag = getGtag();
  if (!gtag) return;
  gtag("event", "conversion", { send_to: GADS_CONTACT_SEND_TO, transport_type: "beacon" });
}
