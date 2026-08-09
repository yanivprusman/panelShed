import { NextRequest, NextResponse } from "next/server";
import { lookupDesignSpec, type DesignSpecRow } from "@/lib/cad-designs";

/**
 * The settings of the shed on screen, in words.
 *
 *   GET /api/design-spec?design=<code>  ->  { ok: true, rows: [{label, value}] }
 *
 * The buy panel shows the simple things — size, add-ons, price. This is the
 * rest of the shed, for the customer who wants to check that the door swings
 * the way he drew it: door position, swing, handle side, roof slope and rise,
 * channel material. Every row is phrased BY the planner in the planner's own
 * words (see CAD lib/design-spec.ts), so what he reads here is what he chose
 * there, and this app never learns what a door swing is.
 *
 * Fetched only when the customer opens the panel — the page must not pay for a
 * CAD round trip nobody asked for — and kept server-side so CAD_QUOTE_BASE_URL
 * (an internal address) never ships to the browser.
 */
export const dynamic = "force-dynamic";

type Ok = { ok: true; rows: DesignSpecRow[] };
type Err = { ok: false; error: string; message: string };

function bad(error: string, message: string, status: number) {
  return NextResponse.json<Err>({ ok: false, error, message }, { status });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("design");
  if (!code) {
    return bad("missing_design", "לא צוין עיצוב.", 400);
  }

  // No fallback: a CAD outage says so. Showing an empty list would tell the
  // customer his shed has no settings, which is a lie about the product.
  try {
    const found = await lookupDesignSpec(code);
    if (found.state === "expired") {
      return bad(
        "design_expired",
        "הקישור לעיצוב הזה היה בתוקף 10 ימים ופג, ולכן אי אפשר להציג את פרטיו. דברו איתנו ונשלח לכם קישור חדש.",
        410,
      );
    }
    if (found.state === "unknown") {
      return bad("design_unknown", "לא מצאנו את העיצוב הזה.", 404);
    }
    return NextResponse.json<Ok>({ ok: true, rows: found.rows });
  } catch (e) {
    console.error("design-spec failed:", e);
    return bad(
      "spec_failed",
      "לא הצלחנו להציג את פרטי המחסן כרגע. נסו שוב עוד רגע או דברו איתנו בוואטסאפ.",
      502,
    );
  }
}
