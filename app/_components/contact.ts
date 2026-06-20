/**
 * Single source of truth for the storefront's brand + contact details, shared
 * by the header, footer and purchase card. The WhatsApp deep-link message is
 * built per-context: the header/footer use a generic message, while the buy
 * card uses the reactive product title.
 */
export const BRAND = "פאנל-שד";
export const SLOGAN = "מכירה והתקנת מחסנים מפאנל מבודד בכל הארץ";

export const PHONE_DISPLAY = "055-667-7260";
const PHONE_E164 = "972556677260";
export const TEL_URL = `tel:+${PHONE_E164}`;

export const whatsappUrl = (message: string) =>
  `https://wa.me/${PHONE_E164}?text=${encodeURIComponent(message)}`;

/** Size-agnostic WhatsApp link for the header / footer. */
export const GENERIC_WHATSAPP_URL = whatsappUrl(
  "שלום, אשמח לקבל פרטים על מחסני פאנל מבודד",
);
