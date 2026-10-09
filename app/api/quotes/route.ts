import { NextResponse } from "next/server";
import { isOwner, sameOrigin } from "@/lib/owner-auth";
import { priceOrder } from "@/lib/price-order";
import { issueQuote } from "@/lib/quotes";
import { quotePdf } from "@/lib/quote-pdf";
import { heightOf } from "@/app/_components/sizes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type QuotePayload = {
  shed?: unknown;
  choices?: unknown;
  /** What the card showed. Checked, never used — see /api/checkout. */
  claimedTotalIls?: number;
  customer?: { name?: string; phone?: string; email?: string; address?: string };
  notes?: string;
};

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

/**
 * Issue a price quote for the configuration on the owner's screen and return
 * it as a PDF.
 *
 * Owner only. The price is the server's, computed by the same code that
 * charges at checkout, so the PDF a customer is holding is the amount the buy
 * button would take — and it is frozen into data/quotes.json under its number.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "bad_origin" }, { status: 403 });
  }
  if (!(await isOwner())) {
    return NextResponse.json({ ok: false, error: "not_owner" }, { status: 401 });
  }

  let body: QuotePayload;
  try {
    body = (await request.json()) as QuotePayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const customer = {
    name: clean(body.customer?.name, 120),
    phone: clean(body.customer?.phone, 40),
    email: clean(body.customer?.email, 120),
    address: clean(body.customer?.address, 200),
  };
  if (!customer.name) {
    return NextResponse.json(
      { ok: false, error: "missing_name", message: "חסר שם הלקוח" },
      { status: 400 },
    );
  }

  const priced = await priceOrder(body.shed, body.choices);
  if (!priced.ok) {
    return NextResponse.json(
      { ok: false, error: priced.error, message: priced.message },
      { status: priced.status },
    );
  }

  // A stale tab must not produce a quote for a number the screen is not showing.
  const claimed = body.claimedTotalIls;
  if (typeof claimed === "number" && Math.abs(claimed - priced.total) > 0.5) {
    return NextResponse.json(
      {
        ok: false,
        error: "price_changed",
        message: `המחיר התעדכן (₪${priced.total.toLocaleString("he-IL")}). רעננו את העמוד ובדקו לפני הפקת ההצעה.`,
      },
      { status: 409 },
    );
  }

  const { size } = priced;
  const quote = await issueQuote({
    customer,
    notes: clean(body.notes, 2000),
    title: priced.title,
    widthCm: size.widthCm,
    depthCm: size.depthCm,
    heightCm: heightOf(size),
    custom: !!size.custom,
    nonStandardSize: priced.nonStandardSize,
    designCode: priced.designCode,
    basePrice: size.price,
    lines: priced.lines,
    choiceLines: priced.choiceLines,
    totalIls: priced.total,
  });

  let pdf: Buffer;
  try {
    pdf = await quotePdf(quote);
  } catch (e) {
    console.error(`[quotes] PDF render failed for ${quote.number}`, e);
    return NextResponse.json(
      { ok: false, error: "pdf_failed", message: `ההצעה ${quote.number} נשמרה, אך הפקת ה-PDF נכשלה.` },
      { status: 500 },
    );
  }

  console.log(`[quotes] issued ${quote.number} for ${customer.name}: ₪${quote.totalIls}`);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // ASCII filename for old clients, the Hebrew one for everything else.
      "Content-Disposition": `attachment; filename="quote-${quote.number}.pdf"; filename*=UTF-8''${encodeURIComponent(`הצעת מחיר ${quote.number}.pdf`)}`,
      "X-Quote-Number": quote.number,
    },
  });
}
