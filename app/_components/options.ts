import {
  SHIPPING_ILS,
  WINDOW_ILS,
  floorPriceFor,
  deliveryInstallPriceFor,
  type PricedShedSize,
  type ShedSizeSpec,
} from "./sizes";
import type { OptionChoice, OptionGroup } from "./planner";

/**
 * The add-ons, and what they cost — defined ONCE, for both the card that shows
 * a price and the route that charges one.
 *
 * This list used to live inside app/page.tsx and the arithmetic inside a React
 * hook, which meant the server had no way to price anything and /api/checkout
 * simply charged whatever total the browser sent it. Anyone could replay their
 * own checkout request with a smaller number and get a real payment page for
 * it. A price the server cannot compute is a price the customer decides, so the
 * definition moved here where a route can import it.
 *
 * Nothing in this file may become client-only ("use client", a hook, a browser
 * global): app/api/checkout imports it, and that import is the whole point.
 */

// LOCKED: three configurator options — delivery (הובלה/הרכבה), floor (ריצפה)
// and a window (חלון).
//
// The door upgrade ("תוספת שדרוג דלת") stays OUT. It and a windows dropdown
// were both removed on 2026-06-20 (199812f, "trim configurator to delivery +
// floor with real priced options") — and the reason is in that title: they were
// EMPTY placeholders, a <select> whose only entry was "בחר". What was removed
// was a control that priced nothing, not the idea of selling a window.
//
// The window returned on 2026-08-26 with real, competitor-verified prices (see
// sizes.ts::WINDOW_ILS). Do not re-add the door the same way: bring a verified
// price or leave it out.
//
// NOTE the window is NOT in the 3D planner — CAD's geometry engine has no
// opening of any kind, so the shed in the frame beside the price has blank walls
// whichever window is chosen. Selling it as a line item is honest; drawing it
// would need CAD to model an opening first.
//
// Shipping is priced separately from installation (user decision 2026-07-11,
// competitor-verified against panelil.co.il): flat ₪450 shipping-only, and
// הובלה+הרכבה derived from footprint (₪2,350; 3x4 → ₪2,840) via
// deliveryInstallPriceFor. Installation is never sold without shipping — no
// competitor offers it and neither do we.
//
// The `id`s are the stable names the planner round trip restores selections by
// (see ./planner.ts) AND the names the checkout request prices by. They travel
// in URLs and in payment requests, so renaming one breaks a customer mid-trip
// and rejects a checkout from an open tab. Change a label freely; leave ids
// alone.
//
// EVERY group's first choice must be the free "ללא" one — the configurator
// defaults to index 0, and a paid default would charge for something nobody
// picked.
export const OPTION_GROUPS: OptionGroup[] = [
  {
    id: "delivery",
    label: "הובלה והרכבה:",
    choices: [
      { id: "none", label: "ללא (איסוף עצמי)", price: null },
      { id: "shipping", label: "הובלה בלבד", price: SHIPPING_ILS },
      {
        id: "shipping-install",
        label: "הובלה והרכבה",
        price: null,
        priceFromSize: "deliveryInstall",
      },
    ],
  },
  {
    id: "floor",
    label: "ריצפה",
    choices: [
      { id: "none", label: "ללא", price: null },
      // Floor price scales with the footprint (hamechola parity) — resolved
      // from the selected size, not a flat number.
      { id: "pine-deck", label: "במת דק מעץ אורן מלא", price: null, priceFromSize: "floor" },
    ],
  },
  {
    // Flat prices, so no priceFromSize: a window is one bought-in unit fitted
    // into a cut, and both competitors charge the same for it on every shed
    // size. The choice labels name the glazing the way they do, because that is
    // what the buyer is comparing across tabs.
    id: "window",
    label: "חלון",
    choices: [
      { id: "none", label: "ללא", price: null },
      { id: "alu-40", label: "חלון אלומיניום 40/40 (רפרפה, זכוכית ורשת)", price: WINDOW_ILS.alu40 },
      { id: "alu-80", label: "חלון אלומיניום 80/80 (הזזה, זכוכית ורשת)", price: WINDOW_ILS.alu80 },
      {
        id: "alu-80-100",
        label: "חלון אלומיניום 80/100 (הזזה, זכוכית ורשת)",
        price: WINDOW_ILS.alu80x100,
      },
    ],
  },
];

/**
 * What one choice costs on one shed.
 *
 * Some add-ons (pine-deck floor, delivery+install) are priced by footprint, not
 * flat — their choice carries priceFromSize and the real price is derived from
 * the selected size.
 *
 * `available` is NOT the same as "price is null": "ללא (איסוף עצמי)" is free
 * (null price, available), while הובלה+הרכבה above the top competitor-verified
 * tier has no price we can stand behind and is genuinely unavailable. Keeping
 * them apart is what stops an unpriceable add-on from being sold for ₪0. Floor
 * is a ₪/m² formula, so it holds for any footprint.
 */
export function resolveChoicePrice(
  c: OptionChoice,
  size: ShedSizeSpec,
): { price: number | null; available: boolean } {
  if (c.priceFromSize === "floor") {
    return { price: floorPriceFor(size), available: true };
  }
  if (c.priceFromSize === "deliveryInstall") {
    const p = deliveryInstallPriceFor(size);
    return { price: p, available: p !== null };
  }
  return { price: c.price, available: true };
}

/** Chosen choice id per group id — `{ delivery: "shipping-install", floor: "none", … }`. */
export type ChoiceSelection = Record<string, string>;

export type PricedLine = {
  groupId: string;
  groupLabel: string;
  choiceId: string;
  choiceLabel: string;
  price: number | null;
};

export type ConfigurationPrice =
  | { ok: true; lines: PricedLine[]; addons: number; total: number }
  | { ok: false; error: string; message: string };

/**
 * The price of one configuration — the authority, and the only one.
 *
 * Every disagreement between what was sent and what we sell is an ERROR, never
 * a quiet default:
 *
 *   - a group not named          → the sender's catalogue differs from ours
 *   - a group we don't have      → same, the other way round
 *   - a choice id we don't have  → a retired or invented option
 *   - a choice we can't price    → an add-on above the verified install tiers
 *
 * All four mean the page that produced this request is not selling what this
 * server sells — a stale tab after a deploy, or a hand-made request. Defaulting
 * a missing group to "ללא" would silently drop a paid add-on from an order the
 * customer thinks includes it, which is the same class of bug as trusting the
 * total: a number nobody computed, standing in for one somebody chose.
 */
export function priceConfiguration(
  size: PricedShedSize,
  sel: ChoiceSelection,
): ConfigurationPrice {
  const known = new Set(OPTION_GROUPS.map((g) => g.id));
  for (const id of Object.keys(sel)) {
    if (!known.has(id)) {
      return { ok: false, error: "option_unknown", message: `אפשרות לא מוכרת: ${id}` };
    }
  }

  const lines: PricedLine[] = [];
  let addons = 0;

  for (const g of OPTION_GROUPS) {
    // Some group labels carry a trailing colon for the form ("הובלה והרכבה:"),
    // which reads as a typo mid-sentence. Trimmed once, here, so the messages
    // and the order lines below all use the same clean name.
    const groupLabel = g.label.replace(/\s*:\s*$/, "");
    const choiceId = sel[g.id];
    if (choiceId === undefined) {
      return { ok: false, error: "option_missing", message: `לא נבחרה אפשרות עבור ${groupLabel}` };
    }
    const choice = g.choices.find((c) => c.id === choiceId);
    if (!choice) {
      return {
        ok: false,
        error: "choice_unknown",
        message: `אפשרות לא מוכרת עבור ${groupLabel}: ${choiceId}`,
      };
    }
    const { price, available } = resolveChoicePrice(choice, size);
    if (!available) {
      return {
        ok: false,
        error: "choice_unavailable",
        message: `${choice.label} אינו זמין במידה הזו`,
      };
    }
    lines.push({
      groupId: g.id,
      groupLabel,
      choiceId: choice.id,
      choiceLabel: choice.label,
      price,
    });
    addons += price ?? 0;
  }

  return { ok: true, lines, addons, total: size.price + addons };
}
