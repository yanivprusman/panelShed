import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOM_LIMITS,
  customSizeLabel,
  footprintSqm,
  STANDARD_HEIGHT_CM,
  type PricedShedSize,
} from "@/app/_components/sizes";
import { quoteMaterialsPrice, quoteDesignPrice } from "@/lib/cad-quote";
import { lookupDesign } from "@/lib/cad-designs";

/**
 * Price a shed the customer designed in the CAD planner.
 *
 * The planner ("מתכנן המחסן" / diy-cad.com) is where we send people who want a
 * footprint the six catalogue SKUs don't cover. It sends them back here with
 * /?width=&length=&height= (cm), and this route turns those dimensions into a
 * real, sellable price — the SAME CAD bill of materials the catalogue sizes are
 * priced from, at the panel-shed distributor's prices.
 *
 *   GET /api/custom-quote?width=250&length=320&height=220
 *
 * Nothing here is estimated. Materials are a live CAD quote; the floor is the
 * published ₪400/m² rate; shipping is flat; installation comes from the
 * competitor-verified tier table and is simply unavailable above the top
 * verified tier (the caller then points the customer at us). Dimensions outside
 * CUSTOM_LIMITS are refused rather than quoted — CAD's engineering clamp is
 * wider than what we actually sell.
 *
 * Kept server-side so CAD_QUOTE_BASE_URL (an internal address) never ships to
 * the browser.
 */
export const dynamic = "force-dynamic";

type Ok = { ok: true; size: PricedShedSize; designCode?: string };
type Err = { ok: false; error: string; message: string };

function bad(error: string, message: string, status = 400) {
  return NextResponse.json<Err>({ ok: false, error, message }, { status });
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const designCode = sp.get("design");

  // Two ways in, and they mean different things.
  //
  //   ?design=<code>  a SHED the visitor designed — door side, roof slope and
  //                   channel included. Priced as that shed.
  //   ?width=&length= a FOOTPRINT, nothing more. Priced with the planner's own
  //                   defaults, which is what the six catalogue SKUs are.
  //
  // Both still go through CUSTOM_LIMITS below: what we are willing to sell is
  // our decision, not the planner's.
  let widthCm: number;
  let depthCm: number;
  let heightCm: number;

  if (designCode) {
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
    widthCm = Number(sp.get("width"));
    depthCm = Number(sp.get("length"));
    heightCm = sp.get("height") === null ? STANDARD_HEIGHT_CM : Number(sp.get("height"));
  }

  if (![widthCm, depthCm, heightCm].every(Number.isFinite)) {
    return bad("invalid_dimensions", "המידות שהתקבלו מהמתכנן אינן תקינות.");
  }

  const { minCm, maxCm, minHeightCm, maxHeightCm, maxSqm } = CUSTOM_LIMITS;
  const inRange = (v: number, lo: number, hi: number) => v >= lo && v <= hi;
  if (!inRange(widthCm, minCm, maxCm) || !inRange(depthCm, minCm, maxCm)) {
    return bad(
      "out_of_range",
      `אנחנו מוכרים מחסנים ברוחב ובעומק שבין ${minCm / 100} ל-${maxCm / 100} מטר. ` +
        `למידות אחרות — דברו איתנו ונבנה לכם הצעה.`,
    );
  }
  if (!inRange(heightCm, minHeightCm, maxHeightCm)) {
    return bad(
      "out_of_range",
      `אנחנו מוכרים מחסנים בגובה שבין ${minHeightCm / 100} ל-${maxHeightCm / 100} מטר. ` +
        `לגובה אחר — דברו איתנו ונבנה לכם הצעה.`,
    );
  }

  const spec = {
    label: customSizeLabel(widthCm, depthCm),
    widthCm,
    depthCm,
    heightCm,
    custom: true as const,
  };

  if (footprintSqm(spec) > maxSqm) {
    return bad(
      "out_of_range",
      `המידות שבחרתם גדולות מ-${maxSqm} מ"ר. דברו איתנו ונבנה לכם הצעה מותאמת.`,
    );
  }

  // No fallback: a CAD outage or an unpriced item throws, and the customer is
  // told we can't quote right now — never a made-up or understated number.
  try {
    // A design is priced as itself; a bare footprint is priced with the
    // planner's defaults, exactly as before.
    const price = designCode
      ? await quoteDesignPrice(designCode)
      : await quoteMaterialsPrice(widthCm, depthCm, heightCm);
    return NextResponse.json<Ok>({ ok: true, size: { ...spec, price }, designCode: designCode ?? undefined });
  } catch (e) {
    console.error("custom-quote failed:", e);
    return bad(
      "quote_failed",
      "לא הצלחנו לתמחר את המידות האלה כרגע. נסו שוב עוד רגע או דברו איתנו בוואטסאפ.",
      502,
    );
  }
}
