import {
  SIZES,
  STANDARD_HEIGHT_CM,
  heightOf,
  type PricedShedSize,
  type ShedSizeSpec,
} from "@/app/_components/sizes";

/**
 * Live materials pricing from the CAD app (user decision 2026-07-11): each
 * shed size's base price is the CAD bill-of-materials total at the
 * panel-shed distributor's prices, fetched from CAD's GET /api/quote and
 * rounded to the nearest ₪10. Distributor price updates (diy-cad.com admin)
 * therefore reach the storefront + merchant feed without a deploy, after at
 * most an hour (fetch revalidate below).
 *
 * The deep-link geometry semantics match the "עצב בתלת-ממד" button
 * (?width=<Wcm>&length=<Dcm>&height=220), so the storefront price and the
 * CAD page's own price proposal for the same shed can never diverge.
 *
 * The same endpoint prices ANY footprint, which is what lets a shed designed in
 * the CAD planner come back here and be sold — see app/api/custom-quote.
 *
 * No fallback: if CAD is unreachable or any priceable item lacks a price,
 * this throws and the page/feed fails loudly rather than showing stale or
 * understated prices.
 */
type QuoteResponse = {
  success: boolean;
  total?: number;
  missing?: string[];
  error?: string;
};

function quoteBaseUrl(): string {
  const base = process.env.CAD_QUOTE_BASE_URL;
  if (!base) {
    throw new Error(
      "CAD_QUOTE_BASE_URL is not set — point it at the CAD app (e.g. http://localhost:3001)",
    );
  }
  return base.replace(/\/$/, "");
}

export async function quoteMaterialsPrice(
  widthCm: number,
  depthCm: number,
  heightCm: number = STANDARD_HEIGHT_CM,
): Promise<number> {
  const url =
    `${quoteBaseUrl()}/api/quote?code=panel-shed` +
    `&width=${widthCm}&length=${depthCm}&height=${heightCm}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`CAD quote failed (${res.status}) for ${widthCm}x${depthCm}`);
  }
  const data = (await res.json()) as QuoteResponse;
  if (!data.success || typeof data.total !== "number") {
    throw new Error(`CAD quote failed for ${widthCm}x${depthCm}: ${data.error ?? "no total"}`);
  }
  if (data.missing && data.missing.length > 0) {
    throw new Error(
      `CAD quote for ${widthCm}x${depthCm} is missing distributor prices: ${data.missing.join(", ")}`,
    );
  }
  return Math.round(data.total / 10) * 10;
}

/**
 * Price a shed the customer DESIGNED, by the code CAD gave it.
 *
 * Deliberately not `quoteMaterialsPrice(width, depth, height)`: a footprint is
 * not a shed. The roof slope and the top-channel material change the bill of
 * materials — on a 3x2, turning the slope from front-to-back to left-to-right
 * moves the total by ₪37 — so pricing a design by its three dimensions quotes a
 * different shed than the one in the 3D view beside the price.
 *
 * The code is opaque here. This app never reads a CAD parameter name; it
 * carries a string CAD minted and hands it back.
 */
export async function quoteDesignPrice(designCode: string): Promise<number> {
  const url = `${quoteBaseUrl()}/api/quote?code=panel-shed&design=${encodeURIComponent(designCode)}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`CAD quote failed (${res.status}) for design ${designCode}`);
  }
  const data = (await res.json()) as QuoteResponse;
  if (!data.success || typeof data.total !== "number") {
    throw new Error(`CAD quote failed for design ${designCode}: ${data.error ?? "no total"}`);
  }
  if (data.missing && data.missing.length > 0) {
    throw new Error(
      `CAD quote for design ${designCode} is missing distributor prices: ${data.missing.join(", ")}`,
    );
  }
  return Math.round(data.total / 10) * 10;
}

/** Attach the live CAD-quoted materials price to one size spec. */
export async function priceSize(s: ShedSizeSpec): Promise<PricedShedSize> {
  return { ...s, price: await quoteMaterialsPrice(s.widthCm, s.depthCm, heightOf(s)) };
}

/** All storefront sizes with their live CAD-quoted materials prices. */
export async function getPricedSizes(): Promise<PricedShedSize[]> {
  return Promise.all(SIZES.map(priceSize));
}
