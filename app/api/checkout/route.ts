import { NextResponse, after } from "next/server";
import { appendOrder, updateOrder, type Order, type OrderLine } from "@/lib/orders";
import { growMakeConfig, createPaymentLink } from "@/lib/growMake";
import { isValidIsraeliMobile, normalizeIsraeliPhone } from "@/lib/meshulam";
import { notifyOwner } from "@/lib/notify";
import { isPlausibleEmail, normalizeEmail, verifyCode } from "@/lib/emailVerification";

export const runtime = "nodejs";

type CheckoutPayload = {
  name?: string;
  phone?: string;
  /** Optional. If present it must come with a token+code proving it exists. */
  email?: string;
  emailToken?: string;
  emailCode?: string;
  notes?: string;
  title?: string;
  totalIls?: number;
  options?: OrderLine[];
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
  const total = typeof body.totalIls === "number" ? body.totalIls : NaN;
  if (!Number.isFinite(total) || total <= 0) {
    return NextResponse.json({ ok: false, error: "bad_total" }, { status: 400 });
  }

  const order: Order = {
    id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    name,
    phone: normalizeIsraeliPhone(phone),
    email,
    notes: (body.notes ?? "").trim(),
    title: body.title ?? "",
    totalIls: total,
    options: Array.isArray(body.options) ? body.options : [],
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
