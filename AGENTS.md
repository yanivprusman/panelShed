<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Payments (Grow via the free Make.com bridge)

The "קנה עכשיו" buy card charges the **full amount** online via **Grow** (Israeli
processor: **Bit + credit cards + Apple/Google Pay**). Grow's direct Light API costs
**₪500+VAT/month**, so (decision 2026-07-08) payment pages are created through Grow's
**free Make.com app** instead: a Make scenario ("panelshed-checkout", eu1.make.com
scenario `6484620`, account yanivprusman@gmail.com) receives our order webhook, runs
Grow's "Create Payment Link" module (connection authorized to ג.ח. פרוייקטים via
business id + OTP — no Grow credentials in this repo), and answers synchronously with
`{ url, processId, processToken }`.

Flow (all server-side):
1. `app/_components/buy-panel.tsx` → POST `/api/checkout` (name + Israeli mobile + optional email).
2. `app/api/checkout/route.ts` persists a `pending` order (`lib/orders.ts`, `data/orders.json`,
   gitignored) and calls `createPaymentLink` (`lib/growMake.ts`) → returns Grow's hosted-page
   URL (pay.grow.link); the browser is redirected there to pay.
3. `app/api/checkout/callback/route.ts` receives Grow's **server-to-server notification**
   (`notifyUrl`, new-system PaymentLinks format; JSON or form-encoded — both normalised) — the
   **only** authority for marking an order `paid`. It authenticates by looking the order up by
   `processToken` (a server-only shared secret stored at create time), checks the charged `sum`
   against the order total, then flips to `paid`. There is no approveTransaction on the free
   route — duplicate notifications are deduped by the already-paid guard.
4. Grow redirects the buyer to `/checkout/success?order=…`, which polls `/api/checkout/status`
   until the webhook resolves (the redirect itself carries no payment facts).

**Env** (`.env.local`, gitignored): `GROW_MAKE_WEBHOOK_URL` + `GROW_MAKE_WEBHOOK_KEY` (the
`x-make-apikey` value; requests without it get 401 from Make). While blank, `/api/checkout`
returns `payments_not_configured` (503) and the buy button shows a clear error — nothing
silently degrades.

`lib/meshulam.ts` (direct Light-API client, proven in sandbox) is **dormant, kept for a paid
upgrade**: same `{url, processId, processToken}` contract, so swapping back = paying Grow for
API access, getting `userId`/`pageCode`, and switching the call in `/api/checkout`.
Docs: https://grow-il.readme.io/ (API) · grow-il.readme.io/docs/grow-app-for-make (Make app).

Grow's `successUrl`/`notifyUrl` must be public HTTPS (not localhost) — they go through the nginx
host `panelshed.{dev,prod}.ya-niv.com`, derived from the request's `x-forwarded-*` headers.
The Make webhook module payload contract: `orderId, amount, description, customerName,
customerPhone, customerEmail, successUrl, notifyUrl` (orderId also lands in Grow's Custom
Field 1 for console-side reconciliation; installments capped at 3).

# Google Ads conversion tracking

`lib/gtag.ts` + `app/_components/google-ads-tag.tsx` wire Google Ads conversions. The global tag
(`GoogleAdsTag`, rendered in `app/layout.tsx`) only loads when `NEXT_PUBLIC_GOOGLE_ADS_ID` is set —
blank = no tag, and the `report*` helpers are no-ops, so nothing degrades before the account exists.

Two conversion actions, each gated by its own label:
- **Purchase** — fired once from `app/checkout/success/success-client.tsx` when Grow's webhook flips
  the order to `paid`; sends `value` (ILS total) + `transaction_id` (orderId, dedupes reloads).
- **Lead** — fired from `app/_components/buy-panel.tsx` when a buyer submits valid name + Israeli
  mobile. This is the live conversion today, while the buy flow hands off to WhatsApp; `value` is the
  configured cart total. Once the Grow checkout is switched on, Purchase becomes the primary signal.

Env (`.env.local`, gitignored; all `NEXT_PUBLIC_*` — the id/labels are not secret): create the
actions in Google Ads → Tools → Conversions, then set `NEXT_PUBLIC_GOOGLE_ADS_ID` (`AW-…`),
`NEXT_PUBLIC_GADS_PURCHASE_LABEL`, `NEXT_PUBLIC_GADS_LEAD_LABEL` (the label is the part after the
slash in the action's `send_to`).

# Pricing model (2026-07-11)

Three separated price components — the customer composes them in the configurator:
1. **Materials** — quoted LIVE from the CAD app: `lib/cad-quote.ts` fetches
   `GET ${CAD_QUOTE_BASE_URL}/api/quote?code=panel-shed&width=&length=&height=220`
   per size (BOM total at the panel-shed distributor's prices, rounded to ₪10,
   1h revalidate). `sizes.ts` holds NO prices. Updating distributor prices on
   diy-cad.com changes the storefront + merchant feed within an hour, no deploy.
   No fallback: missing env var / unreachable CAD / missing item prices fail loudly.
2. **הובלה (shipping)** — flat `SHIPPING_ILS` (₪450, competitor-verified vs panelil.co.il).
3. **הרכבה (installation)** — only sold WITH shipping ("הובלה והרכבה"), size-tiered via
   `deliveryInstallPriceFor` (₪2,350; >9m² i.e. 3x4 → ₪2,840). No standalone install.

Google Merchant Center (account 5823015132, ג.ח. פרוייקטים) is fully onboarded:
feed `/merchant-feed` (carries `g:shipping` ₪450/IL), account shipping = flat ₪450,
delivery 8–21 business days, return policy = `/returns` page (14 days, ₪100 restocking
fee, buyer pays transport both ways, In-store method).
