import { SIZES, type PricedShedSize } from "@/app/_components/sizes";

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
 * No fallback: if CAD is unreachable or any priceable item lacks a price,
 * this throws and the page/feed fails loudly rather than showing stale or
 * understated prices.
 */
const SHED_HEIGHT_CM = 220;

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

async function quoteMaterialsPrice(widthCm: number, depthCm: number): Promise<number> {
  const url =
    `${quoteBaseUrl()}/api/quote?code=panel-shed` +
    `&width=${widthCm}&length=${depthCm}&height=${SHED_HEIGHT_CM}`;
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

/** All storefront sizes with their live CAD-quoted materials prices. */
export async function getPricedSizes(): Promise<PricedShedSize[]> {
  return Promise.all(
    SIZES.map(async (s) => ({ ...s, price: await quoteMaterialsPrice(s.widthCm, s.depthCm) })),
  );
}
