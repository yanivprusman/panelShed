import { NextRequest, NextResponse } from "next/server";
import { STANDARD_HEIGHT_CM, type PricedShedSize } from "@/app/_components/sizes";
import { resolveDesignedSize } from "@/lib/sellable-size";

/**
 * Price a shed the customer designed in the CAD planner.
 *
 * The planner ("מתכנן המחסן" / diy-cad.com) is where we send people who want a
 * footprint the catalogue doesn't cover. It sends them back here with
 * /?design=<code> (or, on older links, /?width=&length=&height= in cm), and this
 * route turns that into a real, sellable price — the SAME CAD bill of materials
 * the catalogue shed is priced from, at the panel-shed distributor's prices.
 *
 *   GET /api/custom-quote?design=abc123
 *   GET /api/custom-quote?width=250&length=320&height=220
 *
 * The resolution itself lives in lib/sellable-size so that /api/checkout prices
 * the identical shed the identical way. This route is the display half of that
 * pair and deliberately holds no pricing logic of its own: when the two were
 * separate, one of them could quote a shed the other would not charge for.
 *
 * Kept server-side so CAD_QUOTE_BASE_URL (an internal address) never ships to
 * the browser.
 */
export const dynamic = "force-dynamic";

/** `nonStandardSize` marks a shed outside what we routinely sell — priced and
 *  shown all the same, with the caveat said out loud by the caller. */
type Ok = { ok: true; size: PricedShedSize; designCode?: string; nonStandardSize?: boolean };
type Err = { ok: false; error: string; message: string };

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const designCode = sp.get("design");

  const resolved = await resolveDesignedSize(
    designCode
      ? { designCode }
      : {
          widthCm: Number(sp.get("width")),
          depthCm: Number(sp.get("length")),
          heightCm: sp.get("height") === null ? STANDARD_HEIGHT_CM : Number(sp.get("height")),
        },
  );

  if (!resolved.ok) {
    return NextResponse.json<Err>(
      { ok: false, error: resolved.error, message: resolved.message },
      { status: resolved.status },
    );
  }

  return NextResponse.json<Ok>({
    ok: true,
    size: resolved.size,
    designCode: resolved.designCode,
    nonStandardSize: resolved.nonStandardSize,
  });
}
