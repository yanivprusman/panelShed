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
   The email is **optional but never unverified**: if the buyer types one, the form
   mails a 6-digit code (`/api/checkout/verify-email` → `lib/emailVerification.ts`)
   and `/api/checkout` re-checks the token+code server-side before attaching the
   address, so `order.email` is either verified (`emailVerified: true`) or absent.
   Grow refuses a payment page without a syntactically valid email (427), so when
   the buyer gives none it receives `order-<id>@ya-niv.com` — ours, unrouted,
   never used to reach the buyer. This replaced the old mandatory-email rule
   (commit 214275f): demanding identity before showing a payment page is what made
   a real ad-clicking visitor type `2435234k@gmail.com` on 2026-07-19 and leave.
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

# Size selector = standard ⟷ custom (2026-08-05)

The `גודל` dropdown offers exactly **two** rows, and this is deliberate — do not
re-add a list of catalogue SKUs to it:

1. **מידה סטנדרטית** — the catalogue shed, labelled with its footprint AND its
   height (`2×2 מטר · גובה 2.2 מטר`), because a shed is a volume and the height
   used to appear only in the description block far below the fold. Normally the
   2x2; `/?size=<label>` (Merchant feed, Shopping ads) makes that SKU the
   standard for the visit, so feed price == landing-page price still holds and
   `/merchant-feed` keeps listing every SKU.
2. **מידה מותאמת אישית** — selecting it before anything is designed navigates to
   the CAD planner; after a round trip it *is* the designed shed, priced live by
   `/api/custom-quote`.

## The planner round trip carries the whole configuration

`_components/planner.ts` owns both legs. The outbound planner link carries
`cfg=` — a URL-encoded sub-query (`v=1&size=2x2&delivery=…&floor=…`) naming the
active SKU and every add-on choice **by stable id**. CAD treats `cfg` as opaque:
it stores nothing, parses nothing, and echoes it back on its "order these
dimensions" link (`cad/web/lib/storefront-url.ts`, `STOREFRONT_CONFIG_PARAM`).
`SizeProvider` restores it on arrival, so a customer who had already picked
הובלה והרכבה + במת דק comes back to a configured card instead of an empty one.

## Two CAD addresses, and only one of them may be localhost

| var | read by | dev value | why |
|---|---|---|---|
| `CAD_QUOTE_BASE_URL` | the Next **server** (`lib/cad-quote.ts`, `lib/cad-designs.ts`, `/api/*`) | `http://localhost:3001` | the server really is next to cad-dev; keeping it internal is why the address never ships to a browser |
| `NEXT_PUBLIC_CAD_BASE_URL` | the **visitor's browser** (planner link + 3D embed, `_components/planner.ts`) | `https://cad.dev.ya-niv.com` | must be reachable from the device READING the page |

**Never point `NEXT_PUBLIC_CAD_BASE_URL` at localhost.** It resolves silently to
port 3001 of whatever device is reading the page — nothing on a phone, someone
else's app on another workstation. It was `http://localhost:3001` until
2026-08-24, so opening the dev shop at `panelshed.dev.ya-niv.com` from anything
but the desktop it runs on sent "מידה מותאמת אישית" to a dead address and left
the 3D box blank. The two vars look interchangeable and are not.

## Sharing a configured order

`shopConfigUrl()` (`_components/planner.ts`) builds the link BACK to this shop
carrying the shed and every add-on — the same grammar `SizeProvider`'s deep-link
effect reads, so a produced link reopens the exact card it was copied from. It
feeds two things, both from the state that prices the card: the
"העתיקו קישור לתצורה הזו" button, and the WhatsApp CTA message (which lists every
choice, the free ones included — `ריצפה: ללא` is part of the order).

Rooted at the copy of the shop being READ (`window.location.origin`; `SITE_URL`
stands in for the first server render, before the browser has said). A shop that
handed out another copy's address is how a dev link ends up testing production.

**One world, all the way through.** Every leg of the trip stays in the world it
started in:

| leg | dev | prod |
|---|---|---|
| planner link + 3D embed (`NEXT_PUBLIC_CAD_BASE_URL`) | cad.dev.ya-niv.com | diy-cad.com |
| materials quote (`CAD_QUOTE_BASE_URL`, server-side) | localhost:3001 | localhost:3000 |
| return from "הזמינו במידות האלה" | back to the dev shop | back to the prod shop |
| copy-link / WhatsApp link | the dev shop | the prod shop |

The return leg is the one that needed CAD's permission: a distributor registers
only a production `storefront_url`, so a dev round trip used to come home to
production. `cad-dev` now lists this shop in `NEXT_PUBLIC_STOREFRONT_RETURN_ORIGINS`
(see `cad/web/lib/storefront-url.ts`), and **diy-cad.com leaves that empty** — so
production still returns a real customer only to the registered address. Verified
2026-08-24 both ways: dev planner + dev claim → dev shop; prod planner + the same
dev claim → prod shop.

The `id`s on `product.options` in `app/page.tsx` travel in customer-facing URLs —
rename a **label** freely, never an **id** (a rename strands anyone mid-trip; the
version prefix makes a mismatch ignore the whole `cfg` rather than half-apply it).

All configurator state (selected shed, add-on choices, planner URL) lives in
`SizeProvider` — `BuyPanel`, `ProductDims` and `Product3D` all read it from
there, so they cannot disagree.
