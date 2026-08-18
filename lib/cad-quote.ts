import {
  SIZES,
  STANDARD_HEIGHT_CM,
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
 * Everything the shop sells is priced by DESIGN CODE — the catalogue shed and
 * the one a visitor designed alike — so the price on the card, the shed in the
 * 3D frame and the shed the planner opens are the same row in CAD's database,
 * and cannot drift apart. See app/api/custom-quote for the visitor's half.
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

/**
 * Price a bare FOOTPRINT — three numbers with no shed behind them, quoted with
 * the planner's own defaults.
 *
 * Nothing this app builds links this way any more: every link it writes carries
 * a design code. It stays for links written before that was true (a customer's
 * bookmarked /?width=&length=&height= from the old round trip) and for anything
 * hand-made, which have no code to offer and would otherwise 404 a real visitor.
 */
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

/**
 * Attach the live CAD-quoted materials price to one size spec.
 *
 * By its design code, not its dimensions: the catalogue shed is a design row
 * like any other, so it is priced the same way the shed a customer designed is,
 * and the price on the card is a price for a shed we can point at. A SKU without
 * a code fails loudly rather than being priced as a bare footprint — that would
 * quote a shed nobody has seen.
 */
export async function priceSize(s: ShedSizeSpec): Promise<PricedShedSize> {
  if (!s.designCode) {
    throw new Error(
      `Catalogue size ${s.label} has no designCode — mint one with ` +
        `cad/web/scripts/seed-catalogue-design.mjs and put it in SIZES`,
    );
  }
  return { ...s, price: await quoteDesignPrice(s.designCode) };
}

/** All storefront sizes with their live CAD-quoted materials prices. */
export async function getPricedSizes(): Promise<PricedShedSize[]> {
  return Promise.all(SIZES.map(priceSize));
}

/**
 * The shop's own numbers for one design: what the materials sell for, what
 * they cost us, and what's left. Everything ex-VAT except totalIncVat (the
 * sticker price) — VAT is remitted, not earned, so profit compares ex-VAT
 * revenue with ex-VAT cost.
 *
 * profit is null while any priced item lacks a cost in CAD's distributor
 * portal — a partial cost sheet must read as "unknown", never as a higher
 * profit. missingCosts names the items to go fill in.
 */
export type DesignProfitQuote = {
  totalIncVat: number;
  totalExVat: number;
  totalCost: number;
  profit: number | null;
  missingCosts: string[];
};

type ProfitQuoteResponse = QuoteResponse & {
  totalExVat?: number;
  totalCost?: number;
  profit?: number | null;
  missingCosts?: string[];
};

/**
 * ADMIN-ONLY: quote a design with the panel-shed distributor's private
 * cost/profit numbers. Authenticates to CAD with CAD_DISTRIBUTOR_TOKEN
 * (base64 distributorId:code) — required, and the numbers it unlocks must
 * never reach a customer-facing page. Uncached: the admin wants the sheet
 * as it is now, not as it was an hour ago.
 */
export async function quoteDesignProfit(designCode: string): Promise<DesignProfitQuote> {
  const token = process.env.CAD_DISTRIBUTOR_TOKEN;
  if (!token) {
    throw new Error(
      "CAD_DISTRIBUTOR_TOKEN is not set — the admin profit view needs the panel-shed distributor's CAD token",
    );
  }
  const url = `${quoteBaseUrl()}/api/quote?code=panel-shed&design=${encodeURIComponent(designCode)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`CAD profit quote failed (${res.status}) for design ${designCode}`);
  }
  const data = (await res.json()) as ProfitQuoteResponse;
  if (!data.success || typeof data.total !== "number") {
    throw new Error(`CAD profit quote failed for design ${designCode}: ${data.error ?? "no total"}`);
  }
  if (data.missing && data.missing.length > 0) {
    throw new Error(
      `CAD profit quote for design ${designCode} is missing distributor prices: ${data.missing.join(", ")}`,
    );
  }
  if (typeof data.totalExVat !== "number" || typeof data.totalCost !== "number" || data.profit === undefined) {
    // The response has a total but no cost block: CAD rejected the token.
    throw new Error(
      `CAD did not release cost data for design ${designCode} — CAD_DISTRIBUTOR_TOKEN is wrong or stale`,
    );
  }
  return {
    totalIncVat: data.total,
    totalExVat: data.totalExVat,
    totalCost: data.totalCost,
    profit: data.profit,
    missingCosts: data.missingCosts ?? [],
  };
}
