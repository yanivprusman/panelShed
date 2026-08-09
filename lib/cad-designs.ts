import "server-only";

/**
 * A shed designed in the CAD planner, looked up by the code the planner minted.
 *
 * This app is deliberately incurious about what a design contains. It knows a
 * 15-character string, hands it to CAD on the quote and the 3D embed, and
 * stores it on the order. It never learns a CAD parameter name, never
 * validates a field, never defaults one — the exact deal CAD already has with
 * our own `cfg` token, pointed the other way.
 *
 * That holds even now that we SHOW the design's settings (see lookupDesignSpec):
 * CAD answers in finished label/value pairs and we render them as opaque text.
 * A door swing is still a phrase we can print and not a field we understand, so
 * a parameter added to the planner appears here with no edit to this app.
 *
 * What we DO need back is the footprint, because that is ours: the label the
 * shed is sold under, and the CUSTOM_LIMITS check that decides whether we are
 * willing to sell it at all. The code is the ONLY source for it — a link that
 * carries a design carries nothing else, precisely so there is never a second
 * set of numbers to disagree with this one.
 *
 * No token is sent. A customer opening his link must hit the same 10-day
 * window he would on diy-cad.com — carrying the panel-shed credential here
 * would silently make every link immortal on the storefront and nowhere else.
 */

export type DesignLookup =
  | { state: "ok"; widthCm: number; depthCm: number; heightCm: number }
  | { state: "expired" }
  | { state: "unknown" };

function cadBaseUrl(): string {
  const base = process.env.CAD_QUOTE_BASE_URL;
  if (!base) {
    throw new Error(
      "CAD_QUOTE_BASE_URL is not set — point it at the CAD app (e.g. http://localhost:3001)",
    );
  }
  return base.replace(/\/$/, "");
}

/** Codes are minted by CAD as 15 base62 characters; never let anything else
 *  reach a URL we build. */
export function isValidDesignCode(code: unknown): code is string {
  return typeof code === "string" && /^[0-9A-Za-z]{15}$/.test(code);
}

/**
 * One GET of a design row. Returns null for the two answers that are about the
 * LINK rather than a failure — gone, or never existed — and throws for anything
 * else, so a CAD outage can never read as "no such shed".
 */
async function fetchDesign(
  code: string,
  query = "",
): Promise<{ state: "expired" | "unknown" } | { state: "ok"; data: Record<string, unknown> }> {
  const res = await fetch(`${cadBaseUrl()}/api/designs/${code}${query}`, { cache: "no-store" });
  if (res.status === 404) return { state: "unknown" };
  if (res.status === 410) return { state: "expired" };
  if (!res.ok) {
    throw new Error(`CAD design lookup failed (${res.status}) for ${code}`);
  }
  return { state: "ok", data: await res.json() };
}

export async function lookupDesign(code: string): Promise<DesignLookup> {
  if (!isValidDesignCode(code)) return { state: "unknown" };

  const found = await fetchDesign(code);
  if (found.state !== "ok") return found;
  const data = found.data as { storefront?: Record<string, unknown> };
  // `storefront`, never `params`. CAD measures a design two ways — the planner's
  // own numbers, which mean different things depending on its "exact outer
  // dimensions" setting, and the same shed in OUR units. Reading `params` here
  // means reading a shed one wall-inset (10cm) too big whenever a customer
  // ticked that box, and labelling and selling it at the wrong size.
  const s = data?.storefront ?? {};
  // CAD's `width`/`length` are our width/depth — the same convention
  // plannerUrl() sends them out with.
  const widthCm = Number(s.width);
  const depthCm = Number(s.length);
  const heightCm = Number(s.height);
  if (![widthCm, depthCm, heightCm].every(Number.isFinite)) {
    throw new Error(`CAD design ${code} came back without usable dimensions`);
  }
  return { state: "ok", widthCm, depthCm, heightCm };
}

/** One line of the design, as CAD phrased it. Both sides are opaque here. */
export type DesignSpecRow = { label: string; value: string };

export type DesignSpecLookup =
  | { state: "ok"; rows: DesignSpecRow[] }
  | { state: "expired" }
  | { state: "unknown" };

/**
 * What the customer designed, in words — for the "full details" panel beside
 * the price.
 *
 * Deliberately a SEPARATE call from lookupDesign, which prices the shed. The
 * two answer different questions at different moments (pricing on load, this
 * one only if the customer asks to see it), and keeping them apart means a
 * problem with the wording can never stop us selling the shed.
 */
export async function lookupDesignSpec(code: string): Promise<DesignSpecLookup> {
  if (!isValidDesignCode(code)) return { state: "unknown" };

  const found = await fetchDesign(code, "?locale=he");
  if (found.state !== "ok") return found;

  // Shape-check only — a row's TEXT is CAD's business and is never inspected.
  // An answer that isn't rows at all means the two apps disagree about this
  // endpoint, which the panel must report rather than render as blank lines.
  const raw = (found.data as { spec?: unknown }).spec;
  if (!Array.isArray(raw)) {
    throw new Error(`CAD design ${code} came back without a spec`);
  }
  const rows = raw.filter(
    (r): r is DesignSpecRow =>
      !!r && typeof r === "object" &&
      typeof (r as DesignSpecRow).label === "string" &&
      typeof (r as DesignSpecRow).value === "string",
  );
  if (rows.length !== raw.length) {
    throw new Error(`CAD design ${code} returned a malformed spec row`);
  }
  return { state: "ok", rows };
}
