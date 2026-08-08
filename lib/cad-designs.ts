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
 * What we DO need back is the footprint, because that is ours: the label the
 * shed is sold under, and the CUSTOM_LIMITS check that decides whether we are
 * willing to sell it at all.
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

export async function lookupDesign(code: string): Promise<DesignLookup> {
  if (!isValidDesignCode(code)) return { state: "unknown" };

  const res = await fetch(`${cadBaseUrl()}/api/designs/${code}`, { cache: "no-store" });
  if (res.status === 404) return { state: "unknown" };
  if (res.status === 410) return { state: "expired" };
  if (!res.ok) {
    throw new Error(`CAD design lookup failed (${res.status}) for ${code}`);
  }

  const data = await res.json();
  const p = data?.params ?? {};
  // CAD's `width`/`length` are the storefront's width/depth — the same
  // convention plannerUrl() sends them out with.
  const widthCm = Number(p.width);
  const depthCm = Number(p.length);
  const heightCm = Number(p.height);
  if (![widthCm, depthCm, heightCm].every(Number.isFinite)) {
    throw new Error(`CAD design ${code} came back without usable dimensions`);
  }
  return { state: "ok", widthCm, depthCm, heightCm };
}
