import "server-only";

/**
 * Grow (formerly Meshulam) "Light Server" payment client. Grow is an Israeli
 * direct processor that accepts Bit + local/foreign credit cards + Apple/Google
 * Pay — the right fit for an Israeli storefront. Flow (see grow-il.readme.io):
 *
 *   1. createPaymentProcess (server→Grow, form-urlencoded) → { url, processId,
 *      processToken }. Redirect the buyer's browser to `url` (Grow's hosted
 *      page). We keep processToken server-side — it is the shared secret that
 *      later authenticates the webhook.
 *   2. Buyer pays on Grow. Grow POSTs a server-to-server callback to notifyUrl
 *      with the transaction details (incl. the same processId/processToken and
 *      our cField1 = orderId).
 *   3. We authenticate the callback (processToken must match what we stored),
 *      mark the order paid, then call approveTransaction to acknowledge Grow.
 *
 * The browser's successUrl redirect is NOT authoritative — it carries no
 * transaction data, only `&response=success` + cFields — so payment state is
 * driven exclusively by the webhook.
 *
 * All requests are server-side only (Grow blocks browser-origin calls) and must
 * contain no "special characters" — hence sanitizeForGrow() on free text.
 */

export interface MeshulamConfig {
  pageCode: string;
  userId: string;
  apiKey?: string; // only for platforms billing on behalf of multiple businesses
  environment: "sandbox" | "live";
}

export function meshulamConfig(): MeshulamConfig | null {
  const pageCode = process.env.MESHULAM_PAGE_CODE;
  const userId = process.env.MESHULAM_USER_ID;
  if (!pageCode || !userId) return null;
  return {
    pageCode,
    userId,
    apiKey: process.env.MESHULAM_API_KEY || undefined,
    environment: process.env.MESHULAM_ENV === "live" ? "live" : "sandbox",
  };
}

function apiBase(env: MeshulamConfig["environment"]): string {
  return env === "live"
    ? "https://secure.meshulam.co.il/api/light/server/1.0"
    : "https://sandbox.meshulam.co.il/api/light/server/1.0";
}

/**
 * Grow rejects "special characters" in any parameter. Keep letters (Latin +
 * Hebrew), digits and spaces; turn everything else into a space; collapse runs.
 */
export function sanitizeForGrow(s: string, max = 120): string {
  return s
    .replace(/[^0-9A-Za-z֐-׿ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Normalise an Israeli number to local 0XXXXXXXXX form (handles +972 / 972). */
export function normalizeIsraeliPhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("972")) d = "0" + d.slice(3);
  return d;
}

/** Grow's pageField[phone] wants a valid Israeli mobile (05X + 7 digits). */
export function isValidIsraeliMobile(raw: string): boolean {
  return /^05\d{8}$/.test(normalizeIsraeliPhone(raw));
}

interface CreateProcessArgs {
  cfg: MeshulamConfig;
  sum: number;
  description: string;
  fullName: string;
  phone: string;
  email?: string;
  orderId: string;
  origin: string; // https public origin, e.g. https://panelshed.prod.ya-niv.com
}

export interface CreateProcessResult {
  url: string;
  processId: string;
  processToken: string;
}

interface GrowEnvelope<T> {
  status?: number | string;
  err?: unknown;
  data?: T;
}

function isOk(status: number | string | undefined): boolean {
  return status === 1 || status === "1";
}

/**
 * Create a single-payment (full amount) charge process and return Grow's hosted
 * payment URL + the process identifiers to persist on the order. cField1 carries
 * our orderId so the webhook can find the order.
 */
export async function createPaymentProcess({
  cfg,
  sum,
  description,
  fullName,
  phone,
  email,
  orderId,
  origin,
}: CreateProcessArgs): Promise<CreateProcessResult> {
  const params = new URLSearchParams();
  params.set("pageCode", cfg.pageCode);
  params.set("userId", cfg.userId);
  if (cfg.apiKey) params.set("apiKey", cfg.apiKey);
  params.set("chargeType", "1"); // regular charge
  params.set("sum", sum.toFixed(2));
  params.set("paymentNum", "1");
  params.set("maxPaymentNum", "1"); // full amount, no installments
  params.set("description", sanitizeForGrow(description));
  params.set("pageField[fullName]", sanitizeForGrow(fullName, 60));
  params.set("pageField[phone]", normalizeIsraeliPhone(phone));
  if (email) params.set("pageField[email]", email.trim());
  params.set("cField1", orderId);
  params.set("successUrl", `${origin}/checkout/success?order=${encodeURIComponent(orderId)}`);
  params.set("cancelUrl", `${origin}/?checkout=cancel`);
  params.set("notifyUrl", `${origin}/api/checkout/callback`);

  const res = await fetch(`${apiBase(cfg.environment)}/createPaymentProcess`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });

  const body = (await res.json()) as GrowEnvelope<{
    url?: string;
    processId?: number | string;
    processToken?: string;
  }>;

  if (!res.ok || !isOk(body.status) || !body.data?.url || body.data.processId == null || !body.data.processToken) {
    throw new Error(
      `Grow createPaymentProcess failed (http ${res.status}): ${JSON.stringify(body).slice(0, 400)}`,
    );
  }

  return {
    url: body.data.url,
    processId: String(body.data.processId),
    processToken: body.data.processToken,
  };
}

/**
 * The decoded server-to-server callback. Grow POSTs form-encoded bracket keys
 * (`data[sum]`, `data[customFields][cField1]`, …) — NOT JSON — so the route
 * flattens request.formData() into this shape.
 */
export interface CallbackData {
  status?: string; // statusCode "2" = שולם (paid)
  sum?: string;
  transactionId?: string;
  transactionToken?: string;
  transactionTypeId?: string;
  paymentType?: string;
  asmachta?: string;
  paymentDate?: string;
  description?: string;
  fullName?: string;
  payerPhone?: string;
  payerEmail?: string;
  cardSuffix?: string;
  cardType?: string;
  cardTypeCode?: string;
  cardBrand?: string;
  cardBrandCode?: string;
  cardExp?: string;
  firstPaymentSum?: string;
  periodicalPaymentSum?: string;
  paymentsNum?: string;
  allPaymentsNum?: string;
  processId?: string;
  processToken?: string;
  cField1?: string;
}

/** statusCode 2 = "שולם" (paid) per Grow's status table. */
export function callbackIsPaid(d: CallbackData): boolean {
  return d.status === "2";
}

/**
 * Acknowledge a completed transaction back to Grow. Required after every
 * successful payment (Grow re-sends the callback up to 5 times without it). This
 * does NOT change the charge — it only confirms receipt — so a failure here must
 * not undo our "paid" state.
 */
export async function approveTransaction(cfg: MeshulamConfig, d: CallbackData): Promise<void> {
  const params = new URLSearchParams();
  params.set("pageCode", cfg.pageCode);
  if (cfg.apiKey) params.set("apiKey", cfg.apiKey);
  const passthrough: (keyof CallbackData)[] = [
    "transactionId", "transactionToken", "transactionTypeId", "paymentType", "sum",
    "firstPaymentSum", "periodicalPaymentSum", "paymentsNum", "allPaymentsNum",
    "paymentDate", "asmachta", "description", "fullName", "payerPhone", "payerEmail",
    "cardSuffix", "cardType", "cardTypeCode", "cardBrand", "cardBrandCode", "cardExp",
    "processId", "processToken",
  ];
  for (const k of passthrough) {
    const v = d[k];
    if (v != null && v !== "") params.set(k, String(v));
  }

  const res = await fetch(`${apiBase(cfg.environment)}/approveTransaction`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Grow approveTransaction http ${res.status}`);
  }
}
