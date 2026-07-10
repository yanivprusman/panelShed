import { SIZES, productTitle, type ShedSize } from "@/app/_components/sizes";
import { SITE_URL, SITE_NAME } from "@/lib/site";

/**
 * Google Merchant Center product feed (RSS 2.0 + the g: namespace), served at
 * /merchant-feed and registered in Merchant Center as a scheduled fetch.
 *
 * One item per shed size, generated from SIZES so prices/titles can never drift
 * from the storefront — the feed regenerates on every deploy (which is when the
 * prices in sizes.ts change). `link` deep-links to /?size=<label> so the ad
 * lands on the matching size and the visible price equals `g:price` (Google
 * disapproves feed↔landing-page price mismatches). Made-to-order sheds have no
 * GTIN/MPN, hence identifier_exists=no.
 */
export const runtime = "nodejs";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function itemXml(s: ShedSize): string {
  const id = `shed-${s.label}`;
  const title = productTitle(s.label);
  const link = `${SITE_URL}/?size=${encodeURIComponent(s.label)}`;
  const description =
    `מחסן גינה מפאנל מבודד בעובי 5 ס"מ, מידה ${s.label} מטר ` +
    `(${s.widthCm}x${s.depthCm} ס"מ). חסין לפגעי מזג אוויר, בידוד וגימור ברמה ` +
    `גבוהה, מיוצר בישראל. משמש כמחסן, משרד או חדר עבודה.`;
  return `    <item>
      <g:id>${esc(id)}</g:id>
      <g:title>${esc(title)}</g:title>
      <g:description>${esc(description)}</g:description>
      <g:link>${esc(link)}</g:link>
      <g:image_link>${SITE_URL}/products/panel-shed-render.png</g:image_link>
      <g:additional_image_link>${SITE_URL}/products/lehamhasha.png</g:additional_image_link>
      <g:availability>in_stock</g:availability>
      <g:price>${s.price}.00 ILS</g:price>
      <g:condition>new</g:condition>
      <g:brand>${esc(SITE_NAME)}</g:brand>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>Home &amp; Garden &gt; Lawn &amp; Garden &gt; Outdoor Structures &gt; Sheds, Garages &amp; Carports</g:google_product_category>
      <g:product_type>מחסני גינה</g:product_type>
    </item>`;
}

export async function GET(): Promise<Response> {
  const items = SIZES.map(itemXml).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${esc(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>מחסני גינה מפאנל מבודד — מגוון גדלים, מיוצר בישראל</description>
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
