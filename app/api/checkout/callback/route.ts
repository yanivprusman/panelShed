import { NextResponse } from "next/server";
import { findOrder, updateOrder } from "@/lib/orders";
import {
  meshulamConfig,
  approveTransaction,
  type CallbackData,
} from "@/lib/meshulam";

export const runtime = "nodejs";

/**
 * Grow server-to-server callback (notifyUrl). This is the ONLY authority for
 * marking an order paid — the browser's successUrl redirect carries no money
 * facts. Grow POSTs form-encoded bracket keys (`data[sum]`,
 * `data[customFields][cField1]`, …), not JSON.
 *
 * Authentication: the callback echoes back the processId + processToken we got
 * from createPaymentProcess. processToken never leaves our server, so a callback
 * whose processToken matches the one we stored on the order proves it came from
 * Grow (not a forged POST). We additionally require the charged sum to match the
 * order total before flipping to paid.
 */
export async function POST(request: Request) {
  const cfg = meshulamConfig();
  if (!cfg) return NextResponse.json({ ok: false }, { status: 503 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_form" }, { status: 400 });
  }
  const get = (k: string): string => {
    const v = form.get(k);
    return typeof v === "string" ? v : "";
  };

  const orderId = get("data[customFields][cField1]") || get("cField1");
  const processId = get("data[processId]");
  const processToken = get("data[processToken]");
  const topStatus = get("status");
  const statusCode = get("data[statusCode]");
  const sumStr = get("data[sum]");

  if (!orderId) {
    console.warn("[checkout/callback] missing cField1/orderId; ignoring");
    return NextResponse.json({ ok: true }); // nothing to do — ack so Grow stops retrying
  }

  const order = await findOrder(orderId);
  if (!order) {
    console.warn(`[checkout/callback] unknown order ${orderId}; ignoring`);
    return NextResponse.json({ ok: true });
  }

  // --- authenticate the callback against the secret we stored at create time ---
  if (!order.processToken || processToken !== order.processToken || processId !== order.processId) {
    console.error(
      `[checkout/callback] processToken/processId mismatch for ${orderId} — possible forgery; ignoring`,
    );
    return NextResponse.json({ ok: true });
  }

  const paid = topStatus === "1" && statusCode === "2";
  const sum = Number.parseFloat(sumStr);

  if (paid) {
    // Amount guard — never fulfil an order charged for the wrong total.
    if (!Number.isFinite(sum) || Math.abs(sum - (order.totalIls ?? -1)) > 0.5) {
      console.error(
        `[checkout/callback] sum mismatch for ${orderId}: charged ${sumStr}, expected ${order.totalIls}; leaving pending`,
      );
      return NextResponse.json({ ok: true });
    }

    if (order.paymentStatus !== "paid") {
      await updateOrder(orderId, {
        paymentStatus: "paid",
        paidSum: sum,
        paidAt: new Date().toISOString(),
        transactionId: get("data[transactionId]"),
        asmachta: get("data[asmachta]"),
        cardSuffix: get("data[cardSuffix]"),
        cardBrand: get("data[cardBrand]"),
        email: order.email || get("data[payerEmail]"),
      });
      console.log(`[checkout/callback] order ${orderId} PAID ₪${sum}`);
    }

    // Acknowledge to Grow (required after each success). Best-effort: an ack
    // failure must not undo the paid state — Grow will simply re-send.
    const cb: CallbackData = {
      status: statusCode,
      sum: sumStr,
      transactionId: get("data[transactionId]"),
      transactionToken: get("data[transactionToken]"),
      transactionTypeId: get("data[transactionTypeId]"),
      paymentType: get("data[paymentType]"),
      asmachta: get("data[asmachta]"),
      paymentDate: get("data[paymentDate]"),
      description: get("data[description]"),
      fullName: get("data[fullName]"),
      payerPhone: get("data[payerPhone]"),
      payerEmail: get("data[payerEmail]"),
      cardSuffix: get("data[cardSuffix]"),
      cardType: get("data[cardType]"),
      cardTypeCode: get("data[cardTypeCode]"),
      cardBrand: get("data[cardBrand]"),
      cardBrandCode: get("data[cardBrandCode]"),
      cardExp: get("data[cardExp]"),
      firstPaymentSum: get("data[firstPaymentSum]"),
      periodicalPaymentSum: get("data[periodicalPaymentSum]"),
      paymentsNum: get("data[paymentsNum]"),
      allPaymentsNum: get("data[allPaymentsNum]"),
      processId,
      processToken,
    };
    try {
      await approveTransaction(cfg, cb);
    } catch (e) {
      console.error(`[checkout/callback] approveTransaction failed for ${orderId}`, e);
    }
    return NextResponse.json({ ok: true });
  }

  // Not a paid status (declined / cancelled). Record it, don't fulfil.
  if (order.paymentStatus === "pending") {
    await updateOrder(orderId, { paymentStatus: "failed", failedAt: new Date().toISOString() });
  }
  console.log(`[checkout/callback] order ${orderId} not paid (statusCode=${statusCode})`);
  return NextResponse.json({ ok: true });
}
