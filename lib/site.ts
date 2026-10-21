/**
 * Canonical site identity for SEO (metadata, sitemap, robots, JSON-LD).
 * SITE_URL is the public production origin the ads + Google index point at.
 */
export const SITE_URL = "https://panelshed.prod.ya-niv.com";
export const SITE_NAME = "פאנל-שד";
export const SITE_DESCRIPTION =
  'מחסן גינה מפאנל מבודד בעובי 5 ס"מ — חסין לפגעי מזג אוויר, בידוד וגימור ברמה גבוהה, מיוצר בישראל. מגוון גדלים החל מ-2x2 מ׳. משמש כמחסן, משרד או חדר עבודה. הזמנה מאובטחת אונליין.';

/** The share-preview fields every page has in common. A page that sets its own
 *  openGraph REPLACES the layout's whole object (Next merges metadata one key
 *  deep), so the image and locale live here for both to spread. */
export const OPEN_GRAPH_BASE = {
  type: "website" as const,
  locale: "he_IL",
  siteName: SITE_NAME,
  images: [
    {
      url: "/products/real-installation.jpg",
      width: 2000,
      height: 1500,
      alt: "מחסן גינה פאנל מבודד",
    },
  ],
};
