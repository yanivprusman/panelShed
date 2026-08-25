import "server-only";
import {
  CUSTOM_LIMITS,
  SIZES,
  STANDARD_HEIGHT_CM,
  customSizeLabel,
  footprintSqm,
  type PricedShedSize,
} from "@/app/_components/sizes";
import { quoteMaterialsPrice, quoteDesignPrice, priceSize } from "@/lib/cad-quote";
import { isValidDesignCode, lookupDesign } from "@/lib/cad-designs";

/**
 * Which shed is being sold, and what its materials cost — resolved on the
 * server, from the shed's own identity.
 *
 * Two routes need this and they must not disagree: /api/custom-quote (what the
 * card shows) and /api/checkout (what the card charges). A shed priced one way
 * for display and another way for payment is the bug this whole module exists
 * to make impossible.
 */

export type SizeResolution =
  | { ok: true; size: PricedShedSize; designCode?: string; nonStandardSize?: boolean }
  | { ok: false; error: string; message: string; status: number };

const bad = (error: string, message: string, status = 400): SizeResolution => ({
  ok: false,
  error,
  message,
  status,
});

/**
 * A shed the customer designed — by its CAD code, or (legacy links only) by a
 * bare footprint.
 *
 *   design code     a SHED: door side, roof slope and channel included, priced
 *                   as that shed.
 *   width/depth/h   a FOOTPRINT, nothing more. Priced with the planner's own
 *                   defaults. Only hand-made and bookmarked links still arrive
 *                   this way; the planner always sends its code.
 *
 * Outside CUSTOM_LIMITS is a WARNING, not a refusal (user decision 2026-08-09):
 * the bounds say what we routinely sell, not what can be built, and CAD costs
 * the shed from its real bill of materials either way. Refusing to price one
 * only hid the customer's own design behind the catalogue shed.
 */
export async function resolveDesignedSize(input: {
  designCode?: string | null;
  widthCm?: number;
  depthCm?: number;
  heightCm?: number;
}): Promise<SizeResolution> {
  const designCode = input.designCode?.trim() || null;

  let widthCm: number;
  let depthCm: number;
  let heightCm: number;

  if (designCode) {
    // Cheap shape check before spending a lookup on obvious rubbish.
    if (!isValidDesignCode(designCode)) {
      return bad("bad_design", "קוד העיצוב אינו תקין.");
    }
    const found = await lookupDesign(designCode);
    if (found.state === "expired") {
      return bad(
        "design_expired",
        "הקישור לעיצוב הזה היה בתוקף 10 ימים ופג. עצבו מחדש במתכנן או דברו איתנו ונשלח לכם קישור חדש.",
        410,
      );
    }
    if (found.state === "unknown") {
      return bad("design_unknown", "לא מצאנו את העיצוב הזה. ייתכן שהקישור הועתק חלקית.", 404);
    }
    ({ widthCm, depthCm, heightCm } = found);
  } else {
    widthCm = Number(input.widthCm);
    depthCm = Number(input.depthCm);
    heightCm = input.heightCm === undefined ? STANDARD_HEIGHT_CM : Number(input.heightCm);
  }

  if (![widthCm, depthCm, heightCm].every(Number.isFinite)) {
    return bad("invalid_dimensions", "המידות שהתקבלו מהמתכנן אינן תקינות.");
  }

  const spec = {
    label: customSizeLabel(widthCm, depthCm),
    widthCm,
    depthCm,
    heightCm,
    custom: true as const,
  };

  const { minCm, maxCm, minHeightCm, maxHeightCm, maxSqm } = CUSTOM_LIMITS;
  const inRange = (v: number, lo: number, hi: number) => v >= lo && v <= hi;
  const nonStandardSize =
    !inRange(widthCm, minCm, maxCm) ||
    !inRange(depthCm, minCm, maxCm) ||
    !inRange(heightCm, minHeightCm, maxHeightCm) ||
    footprintSqm(spec) > maxSqm;

  // No fallback: a CAD outage or an unpriced item fails loudly, and the caller
  // tells the customer we can't quote right now — never a made-up number.
  try {
    const price = designCode
      ? await quoteDesignPrice(designCode)
      : await quoteMaterialsPrice(widthCm, depthCm, heightCm);
    return {
      ok: true,
      size: { ...spec, price },
      designCode: designCode ?? undefined,
      nonStandardSize: nonStandardSize || undefined,
    };
  } catch (e) {
    console.error("resolveDesignedSize failed:", e);
    return bad(
      "quote_failed",
      "לא הצלחנו לתמחר את המידות האלה כרגע. נסו שוב עוד רגע או דברו איתנו בוואטסאפ.",
      502,
    );
  }
}

/**
 * The catalogue shed, by its label. Priced through the same CAD bill of
 * materials as a designed one — the catalogue shed IS a design row, it is just
 * the one the shop sells rather than one a customer drew.
 *
 * A label we don't sell is refused rather than resolved to the nearest thing:
 * a checkout naming a retired SKU is a stale tab, and quietly selling it the
 * current shed at the current price charges for a shed the customer never saw.
 */
export async function resolveCatalogueSize(label: string): Promise<SizeResolution> {
  const spec = SIZES.find((s) => s.label === label);
  if (!spec) {
    return bad(
      "size_unknown",
      "המידה שנבחרה כבר לא במלאי. רעננו את הדף ובחרו שוב.",
      409,
    );
  }
  try {
    return { ok: true, size: await priceSize(spec), designCode: spec.designCode };
  } catch (e) {
    console.error("resolveCatalogueSize failed:", e);
    return bad(
      "quote_failed",
      "לא הצלחנו לתמחר את המחסן כרגע. נסו שוב עוד רגע או דברו איתנו בוואטסאפ.",
      502,
    );
  }
}
