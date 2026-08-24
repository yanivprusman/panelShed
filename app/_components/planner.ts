import { heightOf, metersLabel, type ShedSizeSpec } from "./sizes";
import { SITE_URL } from "@/lib/site";

/**
 * The planner round trip.
 *
 * The storefront sells exactly two things: the standard shed, and whatever the
 * customer designs in the CAD planner ("מתכנן המחסן" / diy-cad.com). The planner
 * is therefore not an exit — it is a loop:
 *
 *   storefront ──(dimensions + full configuration)──▶ planner
 *   storefront ◀──(designed dimensions + the same configuration)── planner
 *
 * Both legs carry the visitor's whole configurator state in one opaque `cfg`
 * parameter; CAD stores nothing and understands nothing of it — it just echoes
 * it back on its "הזמינו את המידות האלה" link (see CAD's lib/storefront-url.ts).
 * So a customer who had picked, say, הובלה והרכבה + במת דק before going off to
 * design a footprint gets those two selections back when they return, instead of
 * an empty form.
 *
 * `cfg` is itself a URL-encoded query string (`v=1&size=2x2&delivery=…`), so it
 * encodes and parses with URLSearchParams — no bespoke parser to get wrong. A
 * `cfg` from an older/newer version is ignored outright rather than
 * half-applied.
 *
 * THE SHED TRAVELS AS ONE THING. A design code is the whole shed, its three
 * dimensions included, so a link carrying one carries nothing else — sending
 * width/length/height beside it would state the same numbers from a second
 * source, and two sources drift (a design drawn with CAD's "exact outer
 * dimensions" reads one wall-inset apart). The dimensions are the message only
 * when there is no design yet: a visitor still on the catalogue shed has no row
 * to point at.
 */

const CAD_BASE = process.env.NEXT_PUBLIC_CAD_BASE_URL || "https://diy-cad.com";

/** The distributor code the planner identifies this storefront by. */
const DISTRIBUTOR_CODE = "panel-shed";

/** Query parameter carrying the round-trip configuration, both ways. */
export const CONFIG_PARAM = "cfg";

/** Query parameter naming which copy of this shop the visitor is reading — the
 *  address CAD should send him back to (CAD's STOREFRONT_RETURN_PARAM). */
const RETURN_PARAM = "shop";

const CONFIG_VERSION = "1";

export type OptionChoice = {
  /** Stable id — the round-trip encoding refers to choices by this, never by position. */
  id: string;
  label: string;
  price: number | null;
  priceFromSize?: "floor" | "deliveryInstall";
};

export type OptionGroup = { id: string; label: string; choices: OptionChoice[] };

/** The configurator state that survives a trip through the planner. */
export type StorefrontConfig = {
  /** Catalogue SKU that was active (the "standard" entry of the size selector). */
  sizeLabel: string;
  /** Index of the chosen choice, per option group. */
  sel: number[];
};

export function encodeConfig(groups: OptionGroup[], config: StorefrontConfig): string {
  const q = new URLSearchParams({ v: CONFIG_VERSION, size: config.sizeLabel });
  groups.forEach((g, i) => {
    const choice = g.choices[config.sel[i] ?? 0];
    if (choice) q.set(g.id, choice.id);
  });
  return q.toString();
}

/**
 * Parse a `cfg` produced by encodeConfig. Returns null when it is absent or
 * from another version — a partially-understood configuration is never applied,
 * because silently restoring half of what the customer picked is worse than
 * restoring none of it. Within a recognised version, a group or choice id we no
 * longer have (an option retired between the two legs of the trip) leaves that
 * one group at its default.
 */
export function decodeConfig(
  groups: OptionGroup[],
  raw: string | null,
): StorefrontConfig | null {
  if (!raw) return null;
  const q = new URLSearchParams(raw);
  if (q.get("v") !== CONFIG_VERSION) return null;
  const sizeLabel = q.get("size");
  if (!sizeLabel) return null;
  return {
    sizeLabel,
    sel: groups.map((g) => {
      const id = q.get(g.id);
      const i = id === null ? -1 : g.choices.findIndex((c) => c.id === id);
      return i >= 0 ? i : 0;
    }),
  };
}

/**
 * Deep-link into the full planner, pre-set to the shed on screen and carrying
 * the configuration home again.
 *
 * With a design code the planner reopens the shed the visitor actually designed
 * — his door side, his roof slope — instead of redrawing a default shed at his
 * footprint and quietly discarding every choice he made. Without one, the
 * dimensions are how we say "start him at this size".
 *
 * `shopOrigin` is WHICH COPY of this shop he is reading. CAD sends everyone
 * back to the one storefront URL the distributor registered — correct for a
 * shopper, and the reason a dev storefront's own round trip used to land on the
 * production shop, where the code being tested does not exist. CAD honours the
 * claim only for an unroutable address (his machine, or the VPN), so it changes
 * nothing for a real customer and everything for whoever is building this.
 */
export function plannerUrl(
  size: ShedSizeSpec,
  groups: OptionGroup[],
  config: StorefrontConfig,
  designCode?: string | null,
  shopOrigin?: string | null,
): string {
  const q = new URLSearchParams({ dcode: DISTRIBUTOR_CODE });
  if (shopOrigin) q.set(RETURN_PARAM, shopOrigin);
  if (designCode) {
    q.set("design", designCode);
  } else {
    q.set("width", String(size.widthCm));
    q.set("length", String(size.depthCm));
    q.set("height", String(heightOf(size)));
  }
  q.set(CONFIG_PARAM, encodeConfig(groups, config));
  return `${CAD_BASE}/?${q.toString()}`;
}

/**
 * The read-only 3D viewer embed of one shed (no round trip, no controls).
 *
 * Same rule as plannerUrl: the code when there is one — the catalogue shed has
 * its own, and a designed one arrives with the visitor — so the frame shows the
 * shed being priced beside it rather than a lookalike rebuilt from three
 * numbers. The code is opaque to us: we carry the string CAD minted and hand it
 * back, exactly as CAD does with our `cfg`.
 */
export function plannerEmbedUrl(size: ShedSizeSpec, designCode?: string | null): string {
  const q = designCode
    ? new URLSearchParams({ embed: "1", design: designCode })
    : new URLSearchParams({
        embed: "1",
        width: String(size.widthCm),
        length: String(size.depthCm),
        height: String(heightOf(size)),
      });
  return `${CAD_BASE}/?${q.toString()}`;
}

/**
 * The link back to THIS shop with everything on screen already chosen — the
 * shed being sold and every add-on beside it. What you send a customer when
 * you have configured his order for him, and what he sends a friend.
 *
 * It is the inbound half of the same grammar the deep-link effect reads
 * (see ./size-context.tsx), and it names the shed the same three ways that
 * effect understands, in the same order of authority:
 *
 *   a designed shed with a code  -> ?design=<code>   (the shed, entire)
 *   a designed shed without one  -> ?width&length&height  (a footprint)
 *   the catalogue shed           -> nothing; `cfg` already carries the SKU
 *
 * The catalogue shed deliberately does NOT travel as its design code even
 * though it has one: a `design=` link puts the shop into custom mode and
 * frames the standard shed as something the customer drew, which is a lie
 * told by a URL.
 *
 * Always rooted at SITE_URL, never at the address this page happens to be
 * open at. A link is made to be sent, and the copy of the shop a customer can
 * open is the public one — the dev host is behind a sign-in wall he will
 * never get through, and localhost is not a place he can go at all.
 */
export function shopConfigUrl(
  groups: OptionGroup[],
  config: StorefrontConfig,
  designed: { size: ShedSizeSpec; designCode: string | null } | null,
): string {
  const q = new URLSearchParams();
  if (designed?.designCode) {
    q.set("design", designed.designCode);
  } else if (designed) {
    q.set("width", String(designed.size.widthCm));
    q.set("length", String(designed.size.depthCm));
    q.set("height", String(heightOf(designed.size)));
  }
  q.set(CONFIG_PARAM, encodeConfig(groups, config));
  return `${SITE_URL}/?${q.toString()}`;
}

/**
 * The planner link for one saved design — the whole shed in a single URL, for
 * an order record or an alert. A customer's link lapses after CAD's 10-day
 * window; ours does not, because these designs are minted under this
 * storefront's distributor code and CAD keeps serving a row to its owner.
 */
export const designUrl = (code: string) =>
  `${CAD_BASE}/?design=${encodeURIComponent(code)}`;

/** "2×2 מטר · גובה 2.2 מטר" — the full shed, height included, in one line. */
export function sizeSummary(s: ShedSizeSpec): string {
  return `${s.label.replace("x", "×")} מטר · גובה ${metersLabel(heightOf(s))} מטר`;
}
