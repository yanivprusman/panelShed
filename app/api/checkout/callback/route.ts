import { NextResponse } from "next/server";
import { findOrderByProcessToken, updateOrder } from "@/lib/orders";
import { notifyOwnerPaid } from "@/lib/notify";

export const runtime = "nodejs";

/**
 * Grow payment notification (notifyUrl) for payment links created via the Make
 * bridge (new Grow system — "מערכת בנקאות חדשה"). This is the ONLY authority for
 * marking an order paid — the browser's successUrl redirect carries no money
 * facts.
 *
 * Payload (per grow-il.readme.io/docs/webhooks, "Regular Payment Webhook Format
 * via PaymentLinks"): a `data` object carrying the transaction facts, including
 * the same processId/processToken that Create Payment Link returned to us. Grow
 * has sent both JSON and form-encoded bracket keys (`data[sum]`) across its
 * systems, so we normalise both encodings by Content-Type before reading fields.
 *
 * Authentication: processToken never leaves our server, so a notification whose
 * data.processToken matches a stored order proves it came from Grow — the token
 * lookup IS the auth. We additionally require the charged sum to match the order
 * total before flipping to paid. Duplicate notifications are harmless: an
 * already-paid order just re-acks 200 without re-notifying the owner (the free
 * Make route has no approveTransaction API, so idempotency is the dedupe).
 */

type Flat = Record<string, string>;

/** Flatten `{data:{sum:"13"}}` JSON or `data[sum]=13` form fields into one map. */
async function readNotification(request: Request): Promise<Flat | null> {
  const contentType = request.headers.get("content-type") ?? "";
  const flat: Flat = {};

  if (contentType.includes("application/json")) {
    let parsed: unknown;
    try {
      parsed = await request.json();
    } catch {
      return null;
    }
    const walk = (obj: unknown, prefix: string) => {
      if (obj === null || typeof obj !== "object") return;
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v !== null && typeof v === "object") walk(v, key);
        else if (v != null) flat[key] = String(v);
      }
    };
    walk(parsed, "");
    return flat;
  }

  try {
    const form = await request.formData();
    for (const [k, v] of form.entries()) {
      if (typeof v !== "string") continue;
      // data[sum] → data.sum ; data[customFields][cField1] → data.customFields.cField1
      flat[k.replace(/\[([^\]]*)\]/g, ".$1")] = v;
    }
    return flat;
  } catch {
    return null;
  }
}

/** First non-empty value among the given keys. */
function pick(flat: Flat, ...keys: string[]): string {
  for (const k of keys) {
    const v = flat[k];
    if (v != null && v !== "") return v;
  }
  return "";
}

export async function POST(request: Request) {
  const flat = await readNotification(request);
  if (!flat) {
    return NextResponse.json({ ok: false, error: "bad_payload" }, { status: 400 });
  }

  // The new-system notification carries TWO token pairs: the payment-LINK one
  // (paymentLinkProcessId/-Token — this is what Create Payment Link returned to
  // us and what the order stores) and a transaction-level processId/processToken
  // minted at charge time. Match the link token; accept the transaction token
  // too in case Grow ever sends only that (an exact match against a stored
  // secret stays authenticated either way).
  const tokenCandidates = [
    pick(flat, "data.paymentLinkProcessToken", "paymentLinkProcessToken"),
    pick(flat, "data.processToken", "processToken"),
  ].filter(Boolean);
  const processId = pick(
    flat,
    "data.paymentLinkProcessId",
    "paymentLinkProcessId",
    "data.processId",
    "processId",
  );
  const statusCode = pick(flat, "data.statusCode", "statusCode");
  const statusText = pick(flat, "data.status", "status");
  const sumStr = pick(flat, "data.sum", "sum", "data.paymentSum", "paymentSum");

  if (tokenCandidates.length === 0) {
    console.warn("[checkout/callback] notification without any process token; ignoring");
    return NextResponse.json({ ok: true }); // ack so Grow stops retrying
  }

  // --- token lookup doubles as authentication (see header comment) ---
  let order = null;
  for (const t of tokenCandidates) {
    order = await findOrderByProcessToken(t);
    if (order) break;
  }
  if (!order) {
    // Log the full field list (values masked) so a naming mismatch diagnoses
    // itself from the journal instead of silently losing payments.
    const masked = Object.keys(flat)
      .map((k) => `${k}=${flat[k].length > 8 ? flat[k].slice(0, 2) + "…" + flat[k].slice(-4) : flat[k]}`)
      .join(" | ");
    console.warn(
      `[checkout/callback] no order for tokens [${tokenCandidates.map((t) => "…" + t.slice(-6)).join(", ")}] (processId ${processId}); fields: ${masked}`,
    );
    return NextResponse.json({ ok: true });
  }

  // statusCode "2" = שולם (paid); the new system also spells it out in `status`.
  const paid = statusCode === "2" || statusText === "שולם";
  const sum = Number.parseFloat(sumStr);

  if (paid) {
    // Amount guard — never fulfil an order charged for the wrong total.
    if (!Number.isFinite(sum) || Math.abs(sum - (order.totalIls ?? -1)) > 0.5) {
      console.error(
        `[checkout/callback] sum mismatch for ${order.id}: charged ${sumStr}, expected ${order.totalIls}; leaving pending`,
      );
      return NextResponse.json({ ok: true });
    }

    if (order.paymentStatus !== "paid") {
      const updated = await updateOrder(order.id, {
        paymentStatus: "paid",
        paidSum: sum,
        paidAt: new Date().toISOString(),
        transactionId: pick(flat, "data.transactionId", "transactionId"),
        asmachta: pick(flat, "data.asmachta", "asmachta"),
        cardSuffix: pick(flat, "data.cardSuffix", "cardSuffix"),
        cardBrand: pick(flat, "data.cardBrand", "cardBrand"),
        email: order.email || pick(flat, "data.payerEmail", "payerEmail"),
      });
      console.log(`[checkout/callback] order ${order.id} PAID ₪${sum}`);
      // Notify the owner (best-effort; never blocks/fails the paid confirmation).
      if (updated) await notifyOwnerPaid(updated);
    }
    return NextResponse.json({ ok: true });
  }

  // Not a paid status (declined / cancelled). Record it, don't fulfil.
  if (order.paymentStatus === "pending") {
    await updateOrder(order.id, { paymentStatus: "failed", failedAt: new Date().toISOString() });
  }
  console.log(
    `[checkout/callback] order ${order.id} not paid (statusCode=${statusCode || statusText})`,
  );
  return NextResponse.json({ ok: true });
}
