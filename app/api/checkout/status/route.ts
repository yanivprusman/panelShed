import { NextResponse } from "next/server";
import { findOrder } from "@/lib/orders";

export const runtime = "nodejs";

/**
 * Read-only payment status for the success page to poll (the webhook that marks
 * an order paid is async, so the buyer may land here a beat before it arrives).
 * Returns only non-sensitive fields.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("order") ?? "";
  if (!id) return NextResponse.json({ ok: false, error: "missing_order" }, { status: 400 });

  const order = await findOrder(id);
  if (!order) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    paymentStatus: order.paymentStatus,
    title: order.title,
    totalIls: order.totalIls,
    cardSuffix: order.cardSuffix ?? null,
  });
}
