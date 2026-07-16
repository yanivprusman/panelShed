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
 * Accessibility coordinator (רכז נגישות) published in the legally-required
 * הצהרת נגישות (accessibility statement) per Israeli Standard 5568 / the
 * Equal Rights for Persons with Disabilities (Service Accessibility) Regulations.
 */
export const ACCESSIBILITY_COORDINATOR = "יניב פרוסמן";
/** Last time the accessibility statement was reviewed/updated. */
export const ACCESSIBILITY_UPDATED = "21 ביוני 2026";

export const whatsappUrl = (message: string) =>
  `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(message)}`;

/** Size-agnostic WhatsApp link for the header / footer. */
export const GENERIC_WHATSAPP_URL = whatsappUrl(
  "שלום, אשמח לקבל פרטים על מחסני פאנל מבודד",
);
