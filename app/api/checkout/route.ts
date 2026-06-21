import { NextResponse } from "next/server";
import { appendOrder, updateOrder, type Order, type OrderLine } from "@/lib/orders";
import {
  meshulamConfig,
  createPaymentProcess,
  isValidIsraeliMobile,
  normalizeIsraeliPhone,
} from "@/lib/meshulam";

export const runtime = "nodejs";

type CheckoutPayload = {
  name?: string;
  phone?: string;
  email?: string;
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
  const cfg = meshulamConfig();
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
  const email = (body.email ?? "").trim();

  if (name.split(/\s+/).filter(Boolean).length < 2) {
    return NextResponse.json({ ok: false, error: "name_two_words" }, { status: 400 });
  }
  if (!isValidIsraeliMobile(phone)) {
    return NextResponse.json({ ok: false, error: "bad_phone" }, { status: 400 });
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
  };

  await appendOrder(order);

  try {
    const proc = await createPaymentProcess({
      cfg,
      sum: total,
      description: order.title || "מחסן פאנל",
      fullName: name,
      phone,
      email: email || undefined,
      orderId: order.id,
      origin,
    });
    await updateOrder(order.id, {
      processId: proc.processId,
      processToken: proc.processToken,
    });
    return NextResponse.json({ ok: true, orderId: order.id, redirectUrl: proc.url });
  } catch (e) {
    console.error("[checkout] createPaymentProcess failed", e);
    await updateOrder(order.id, { paymentStatus: "failed", failedAt: new Date().toISOString() });
    return NextResponse.json({ ok: false, error: "gateway_error" }, { status: 502 });
  }
}
