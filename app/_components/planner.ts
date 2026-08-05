import { heightOf, metersLabel, type ShedSizeSpec } from "./sizes";

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
 * The outbound leg carries the visitor's whole configurator state in one opaque
 * `cfg` parameter; CAD stores nothing and understands nothing of it — it just
 * echoes it back on its "הזמינו את המידות האלה" link (see CAD's
 * lib/storefront-url.ts). So a customer who had picked, say, הובלה והרכבה + במת
 * דק before going off to design a footprint gets those two selections back when
 * they return, instead of an empty form.
 *
 * `cfg` is itself a URL-encoded query string (`v=1&size=2x2&delivery=…`), so it
 * encodes and parses with URLSearchParams — no bespoke parser to get wrong. A
 * `cfg` from an older/newer version is ignored outright rather than
 * half-applied.
 */

const CAD_BASE = process.env.NEXT_PUBLIC_CAD_BASE_URL || "https://diy-cad.com";

/** The distributor code the planner identifies this storefront by. */
const DISTRIBUTOR_CODE = "panel-shed";

/** Query parameter carrying the round-trip configuration, both ways. */
export const CONFIG_PARAM = "cfg";

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
 */
export function plannerUrl(
  size: ShedSizeSpec,
  groups: OptionGroup[],
  config: StorefrontConfig,
): string {
  const q = new URLSearchParams({
    dcode: DISTRIBUTOR_CODE,
    width: String(size.widthCm),
    length: String(size.depthCm),
    height: String(heightOf(size)),
    [CONFIG_PARAM]: encodeConfig(groups, config),
  });
  return `${CAD_BASE}/?${q.toString()}`;
}

/** The read-only 3D viewer embed of one shed (no round trip, no controls). */
export function plannerEmbedUrl(size: ShedSizeSpec): string {
  const q = new URLSearchParams({
    embed: "1",
    width: String(size.widthCm),
    length: String(size.depthCm),
    height: String(heightOf(size)),
  });
  return `${CAD_BASE}/?${q.toString()}`;
}

/** "2×2 מטר · גובה 2.2 מטר" — the full shed, height included, in one line. */
export function sizeSummary(s: ShedSizeSpec): string {
  return `${s.label.replace("x", "×")} מטר · גובה ${metersLabel(heightOf(s))} מטר`;
}
