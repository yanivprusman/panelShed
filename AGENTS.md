<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Payments (Grow / Meshulam)

The "קנה עכשיו" buy card charges the **full amount** online via **Grow (Meshulam)**
— an Israeli direct processor that accepts **Bit + credit cards + Apple/Google Pay**.

Flow (all server-side; Grow blocks browser-origin calls):
1. `app/_components/buy-panel.tsx` → POST `/api/checkout` (name + Israeli mobile + optional email).
2. `app/api/checkout/route.ts` persists a `pending` order (`lib/orders.ts`, `data/orders.json`,
   gitignored) and calls `createPaymentProcess` (`lib/meshulam.ts`) → returns Grow's hosted-page
   URL; the browser is redirected there to pay.
3. `app/api/checkout/callback/route.ts` is Grow's **server-to-server webhook** (`notifyUrl`) — the
   **only** authority for marking an order `paid`. It authenticates the callback by matching the
   `processToken` we stored at create time (a server-only shared secret), checks the charged `sum`
   against the order total, flips to `paid`, then calls `approveTransaction` to acknowledge Grow.
4. Grow redirects the buyer to `/checkout/success?order=…`, which polls `/api/checkout/status`
   until the webhook resolves (the redirect itself carries no payment facts).

**Credentials** live in `.env.local` (gitignored): `MESHULAM_USER_ID`, `MESHULAM_PAGE_CODE`,
`MESHULAM_ENV` (`sandbox`|`live`), optional `MESHULAM_API_KEY`. While blank, `/api/checkout` returns
`payments_not_configured` (503) and the buy button shows a clear error — nothing silently degrades.
Get sandbox identifiers from the Grow dashboard; go `live` only after Grow's production review
(support@grow.business). API reference: https://grow-il.readme.io/.

Grow's `successUrl`/`notifyUrl` must be public HTTPS (not localhost) — they go through the nginx
host `panelshed.{dev,prod}.ya-niv.com`, derived from the request's `x-forwarded-*` headers.

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
