import { SITE_URL } from "@/lib/site";

/**
 * Single source of truth for the storefront's brand + contact details, shared
 * by the header, footer and purchase card. The WhatsApp deep-link message is
 * built per-context: the header/footer use a generic message, while the buy
 * card uses the reactive product title.
 */
export const BRAND = "פאנל-שד";
export const SLOGAN = "מכירה והתקנת מחסנים מפאנל מבודד בכל הארץ";

/**
 * Legal identity of the operating business, shown in the footer and the legal
 * pages (תקנון, פרטיות). Required trust signal for an Israeli online store and
 * for Google Merchant Center's Misrepresentation checks.
 */
export const LEGAL_NAME = "ג.ח. פרוייקטים";
export const BUSINESS_ID = "036211126"; // עוסק מורשה

export const PHONE_DISPLAY = "055-667-7260";
const PHONE_E164 = "972556677260";
export const TEL_URL = `tel:+${PHONE_E164}`;

export const EMAIL = "yanivprusman@gmail.com";
export const MAIL_URL = `mailto:${EMAIL}`;

/**
 * Where internal order alerts are sent. Deliberately NOT the public EMAIL
 * above: Brevo (the SMTP relay every ya-niv.com notification goes through) has
 * the bare address on its suppression list, so it answers "250 queued" and
 * silently discards the message — verified 2026-07-29, the last alert that
 * actually landed was 2026-07-24 11:28. The +panelshed alias is a distinct
 * recipient as far as the suppression list is concerned, delivers to the same
 * inbox, and doubles as a filter handle.
 *
 * Once the address is cleared from the Brevo blocklist this can go back to
 * EMAIL — but until then, pointing alerts at the suppressed address means no
 * alerts at all.
 */
export const ALERT_EMAIL = "yanivprusman+panelshed@gmail.com";

/**
 * Accessibility coordinator (רכז נגישות) published in the legally-required
 * הצהרת נגישות (accessibility statement) per Israeli Standard 5568 / the
 * Equal Rights for Persons with Disabilities (Service Accessibility) Regulations.
 */
export const ACCESSIBILITY_COORDINATOR = "יניב פרוסמן";
/** Last time the accessibility statement was reviewed/updated. */
export const ACCESSIBILITY_UPDATED = "21 ביוני 2026";

/**
 * A pre-filled WhatsApp link — and the one place a pre-filled message is built.
 *
 * EVERY message carries a link back to the shop, appended here rather than
 * written by each caller, because a caller that forgets is invisible: the link
 * is missing from a chat we never see. It was missing from the header, footer
 * and floating buttons for the whole life of the site, so a lead who wanted a
 * second look had to find us in Google again — and on a real lead (25/8/26) the
 * owner ended up pasting the address by hand, hours later. Appending it at the
 * chokepoint makes that failure unrepresentable.
 *
 * `link` is the copy of the shop being read, at the configuration being read
 * (see planner.ts::shopConfigUrl); SITE_URL — the canonical public shop — is
 * what a message with no configuration behind it points at.
 *
 * `tail` is a line placed AFTER the link, for the one thing the customer has to
 * type himself: his יישוב, his measurements. WhatsApp leaves the cursor at the
 * end of the pre-filled text, so a message that ends in "היישוב שלי:" is
 * answered by typing, and the first reply already contains what we would
 * otherwise have to ask for — which, in every lead so far, we did.
 */
export const whatsappUrl = (
  message: string,
  opts: { link?: string; tail?: string } = {},
) => {
  const lines = [message, "", opts.link ?? SITE_URL];
  if (opts.tail) lines.push("", opts.tail);
  return `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(lines.join("\n"))}`;
};

/**
 * The no-JavaScript href behind the header / footer / floating buttons. Those
 * buttons open the message chooser instead (./whatsapp-chooser.tsx) — this is
 * what a middle-click, or a browser with the script blocked, still gets: the
 * old generic sentence, now at least carrying the address of the shop.
 */
export const GENERIC_WHATSAPP_URL = whatsappUrl(
  "שלום, אשמח לקבל פרטים על מחסני פאנל מבודד",
);
