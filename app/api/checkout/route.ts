import { NextResponse, after } from "next/server";
import { appendOrder, updateOrder, type Order, type OrderLine } from "@/lib/orders";
import { growMakeConfig, createPaymentLink } from "@/lib/growMake";
import { isValidIsraeliMobile, normalizeIsraeliPhone } from "@/lib/meshulam";
import { notifyOwner } from "@/lib/notify";
import { isPlausibleEmail, normalizeEmail, verifyCode } from "@/lib/emailVerification";
import { resolveCatalogueSize, resolveDesignedSize } from "@/lib/sellable-size";
import { priceConfiguration, type ChoiceSelection } from "@/app/_components/options";
import { productTitle, heightOf } from "@/app/_components/sizes";

export const runtime = "nodejs";

/**
 * WHICH SHED. A discriminated union rather than a bag of optional fields,
 * because "catalogue 2x2" and "the shed with this design code" are answered by
 * different price sources and confusing them is how one gets charged as the
 * other.
 */
type ShedRef =
  | { kind: "catalogue"; sizeLabel: string }
  | { kind: "design"; designCode: string }
  /** Legacy /?width=&length=&height= links, which carry no design code. */
  | { kind: "footprint"; widthCm: number; depthCm: number; heightCm: number };

type CheckoutPayload = {
  name?: string;
  phone?: string;
  /** Optional. If present it must come with a token+code proving it exists. */
  email?: string;
  emailToken?: string;
  emailCode?: string;
  notes?: string;
  /** The shed, and the add-ons chosen on it. The price is derived from these. */
  shed?: ShedRef;
  choices?: ChoiceSelection;
  /**
   * What the page displayed. NOT what we charge — it is compared against the
   * price this server computes and any disagreement stops the checkout. See
   * the note above the comparison.
   */
  claimedTotalIls?: number;
};

/**
 * Derive the public HTTPS origin Grow must redirect/callback to. Grow rejects
 * localhost and plain HTTP, so this only works when the request comes through
 * the public nginx host (panelshed.{dev,prod}.ya-niv.com). Built from the
 * x-forwarded-* headers nginx sets.
 */
function publicOrigin(request: Request): string | null {
  const h = request.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host || host.startsWith("localhost") || host.startsWith("127.0.0.1")) return null;
  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  const cfg = growMakeConfig();
  if (!cfg) {
    // Explicit, no silent fallback: online payment isn't wired up yet.
    return NextResponse.json(
      { ok: false, error: "payments_not_configured" },
      { status: 503 },
    );
  }

  const origin = publicOrigin(request);
  if (!origin) {
    return NextResponse.json({ ok: false, error: "bad_origin" }, { status: 400 });
  }

  let body: CheckoutPayload;
  try {
    body = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const email = normalizeEmail(body.email ?? "");

  if (name.split(/\s+/).filter(Boolean).length < 2) {
    return NextResponse.json({ ok: false, error: "name_two_words" }, { status: 400 });
  }
  if (!isValidIsraeliMobile(phone)) {
    return NextResponse.json({ ok: false, error: "bad_phone" }, { status: 400 });
  }

  // The email is OPTIONAL — but if one is given it must have proved it can
  // receive mail, by way of a code we sent to it. An address that hasn't is
  // rejected outright rather than stored unproven: a fake address on an order
  // is worse than no address, because it looks like a way to reach the buyer.
  // The proof is re-checked here against the server's own store; the client's
  // claim that it verified counts for nothing.
  if (email) {
    if (!isPlausibleEmail(email)) {
      return NextResponse.json({ ok: false, error: "bad_email" }, { status: 400 });
    }
    const check = verifyCode(body.emailToken ?? "", body.emailCode ?? "", email);
    if (!check.ok) {
      return NextResponse.json(
        { ok: false, error: "email_not_verified", reason: check.error },
        { status: 400 },
      );
    }
  }
  // ── THE PRICE ───────────────────────────────────────────────────────────
  //
  // Derived here, from the shed and the add-ons the buyer named. It used to
  // arrive as `totalIls` and be charged as given, after one check that it was a
  // positive number — so replaying a checkout request with a smaller number
  // produced a real Grow payment page for that smaller number, and the webhook's
  // amount guard passed because it compares the charge against the same figure
  // the browser sent. A total the server cannot compute is a total the customer
  // chooses.
  //
  // Nothing about money is read off the request from here down. The shed's
  // materials price comes from CAD's bill of materials, the add-ons from
  // OPTION_GROUPS, and both are the same sources the page rendered from.
  const shed = body.shed;
  if (!shed || typeof shed !== "object" || typeof shed.kind !== "string") {
    return NextResponse.json({ ok: false, error: "missing_shed" }, { status: 400 });
  }

  const resolved =
    shed.kind === "catalogue"
      ? await resolveCatalogueSize(String(shed.sizeLabel ?? ""))
      : shed.kind === "design"
        ? await resolveDesignedSize({ designCode: String(shed.designCode ?? "") })
        : shed.kind === "footprint"
          ? await resolveDesignedSize({
              widthCm: Number(shed.widthCm),
              depthCm: Number(shed.depthCm),
              heightCm: Number(shed.heightCm),
            })
          : null;

  if (!resolved) {
    return NextResponse.json({ ok: false, error: "bad_shed_kind" }, { status: 400 });
  }
  if (!resolved.ok) {
    return NextResponse.json(
      { ok: false, error: resolved.error, message: resolved.message },
      { status: resolved.status },
    );
  }

  const size = resolved.size;
  const choices = body.choices;
  if (!choices || typeof choices !== "object" || Array.isArray(choices)) {
    return NextResponse.json({ ok: false, error: "missing_choices" }, { status: 400 });
  }

  const priced = priceConfiguration(size, choices as ChoiceSelection);
  if (!priced.ok) {
    return NextResponse.json(
      { ok: false, error: priced.error, message: priced.message },
      { status: 400 },
    );
  }
  const total = priced.total;

  // The page's own figure is checked, not used. A mismatch is either a stale tab
  // (the CAD quote revalidates hourly, so a base price can move under an open
  // page) or a forged request — and both want the buyer to SEE the real number
  // before paying it. Charging our total silently would be safe for us and
  // wrong for him: nobody should be billed an amount the screen never showed.
  const claimed = body.claimedTotalIls;
  if (typeof claimed === "number" && Math.abs(claimed - total) > 0.5) {
    console.warn(
      `[checkout] price mismatch: page said ₪${claimed}, server computed ₪${total} ` +
        `(shed ${shed.kind} ${size.label}, choices ${JSON.stringify(choices)})`,
    );
    return NextResponse.json(
      {
        ok: false,
        error: "price_changed",
        message:
          "המחיר התעדכן מאז שפתחתם את הדף. רעננו את העמוד ובדקו את הסכום לפני התשלום.",
        totalIls: total,
      },
      { status: 409 },
    );
  }

  // What was bought, written from what we priced — not from what was sent. The
  // order record is the thing we build against and argue from, so its lines are
  // ours. A custom size carries its exact dimensions so the build is made to
  // what the customer designed rather than to a rounded label.
  const options: OrderLine[] = [
    {
      label: "גודל",
      choice: size.custom
        ? `${size.label} מטר (מידה מותאמת מהמתכנן: ${size.widthCm}×${size.depthCm}×${heightOf(size)} ס"מ)`
        : `${size.label} מטר`,
      price: size.price,
    },
    ...priced.lines
      .filter((l) => l.price != null)
      .map((l) => ({ label: "תוספת", choice: l.choiceLabel, price: l.price })),
  ];

  const order: Order = {
    id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    name,
    phone: normalizeIsraeliPhone(phone),
    email,
    notes: (body.notes ?? "").trim(),
    title: productTitle(size.label),
    totalIls: total,
    options,
    designCode: resolved.designCode,
    paymentStatus: "pending",
    // Only ever true — an unverified address never reaches this point.
    emailVerified: email ? true : undefined,
  };

  await appendOrder(order);

  try {
    const proc = await createPaymentLink({
      cfg,
      sum: total,
      description: order.title || "מחסן פאנל",
      fullName: name,
      phone,
      // Grow refuses a payment page without a syntactically valid email (427).
      // When the buyer chose not to give one, it gets an address of ours that
      // names the order — never an invented buyer address. Nothing is sent to
      // it; the buyer's receipt is Grow's own confirmation screen.
      email: email || `order-${order.id}@ya-niv.com`,
      orderId: order.id,
      origin,
    });
    await updateOrder(order.id, {
      processId: proc.processId,
      processToken: proc.processToken,
    });
    // Alert AFTER the response: the customer's redirect to the payment page must
    // not wait on two execOnPeer round-trips to the leader.
    after(() => notifyOwner(order, "submitted"));
    return NextResponse.json({ ok: true, orderId: order.id, redirectUrl: proc.url });
  } catch (e) {
    console.error("[checkout] createPaymentLink failed", e);
    const failedAt = new Date().toISOString();
    await updateOrder(order.id, { paymentStatus: "failed", failedAt });
    // The customer is about to see an error. This alert is the only reason
    // anyone will know they exist — it replaces the "submitted" one, so a
    // failed checkout raises exactly one message, not two.
    after(() => notifyOwner({ ...order, paymentStatus: "failed", failedAt }, "failed"));
    return NextResponse.json({ ok: false, error: "gateway_error" }, { status: 502 });
  }
}
