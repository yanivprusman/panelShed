import "server-only";

/**
 * Grow payments via the free Make.com bridge (chosen 2026-07-08 after Grow
 * quoted ₪500+VAT/month for direct Light-API access — see AGENTS.md).
 *
 * Flow:
 *   1. POST an order to our Make scenario's custom webhook (JSON, authenticated
 *      with the x-make-apikey header). The scenario calls Grow's "Create Payment
 *      Link" module and answers synchronously with { url, processId,
 *      processToken } — same contract createPaymentProcess had, so the rest of
 *      the checkout is unchanged.
 *   2. The buyer pays on Grow's hosted page (pay.grow.link — Bit + cards).
 *   3. Grow POSTs the payment notification straight to our notifyUrl
 *      (/api/checkout/callback). We authenticate it by matching data.processToken
 *      against the token stored on the order at create time.
 *
 * The Make scenario ("panelshed-checkout", eu1.make.com scenario 6484620) owns
 * the Grow connection; no Grow credentials live in this repo. Upgrading later to
 * the paid direct API = reviving lib/meshulam.ts and swapping the call in
 * /api/checkout — the contract is identical.
 */

export interface GrowMakeConfig {
  webhookUrl: string;
  apiKey: string;
}

export function growMakeConfig(): GrowMakeConfig | null {
  const webhookUrl = process.env.GROW_MAKE_WEBHOOK_URL;
  const apiKey = process.env.GROW_MAKE_WEBHOOK_KEY;
  if (!webhookUrl || !apiKey) return null;
  return { webhookUrl, apiKey };
}

interface CreateLinkArgs {
  cfg: GrowMakeConfig;
  sum: number;
  description: string;
  fullName: string;
  phone: string;
  email?: string;
  orderId: string;
  origin: string; // https public origin, e.g. https://panelshed.prod.ya-niv.com
}

export interface CreateLinkResult {
  url: string;
  processId: string;
  processToken: string;
}

/**
 * Create a per-order Grow payment page and return its URL + the process
 * identifiers to persist on the order. Amounts are ILS including VAT.
 */
export async function createPaymentLink({
  cfg,
  sum,
  description,
  fullName,
  phone,
  email,
  orderId,
  origin,
}: CreateLinkArgs): Promise<CreateLinkResult> {
  const res = await fetch(cfg.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-make-apikey": cfg.apiKey,
    },
    body: JSON.stringify({
      orderId,
      amount: sum,
      description,
      customerName: fullName,
      customerPhone: phone,
      customerEmail: email ?? "",
      successUrl: `${origin}/checkout/success?order=${encodeURIComponent(orderId)}`,
      notifyUrl: `${origin}/api/checkout/callback`,
    }),
    cache: "no-store",
  });

  const text = await res.text();
  let body: { url?: string; processId?: string; processToken?: string } = {};
  try {
    body = JSON.parse(text);
  } catch {
    // fall through to the explicit error below with the raw text attached
  }

  if (!res.ok || !body.url || !body.processId || !body.processToken) {
    throw new Error(
      `Grow/Make createPaymentLink failed (http ${res.status}): ${text.slice(0, 400)}`,
    );
  }

  return {
    url: body.url,
    processId: String(body.processId),
    processToken: body.processToken,
  };
}
