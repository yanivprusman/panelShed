/**
 * The shed sizes the storefront sells. Label is "<width>x<depth>" in meters;
 * widthCm/depthCm feed the dimensions block. Roof is a single-slope 230→220cm
 * across all sizes.
 *
 * Materials prices are NOT stored here — they're quoted live from the CAD
 * app's bill of materials at the panel-shed distributor's prices (user
 * decision 2026-07-11). See lib/cad-quote.ts::getPricedSizes.
 */
export type ShedSizeSpec = {
  label: string;
  widthCm: number;
  depthCm: number;
  /** Low-wall height. Omitted on the catalogue sizes — they're all STANDARD_HEIGHT_CM.
   *  Set only on a custom size returned from the CAD planner. */
  heightCm?: number;
  /** True for a footprint designed in the CAD planner rather than a catalogue SKU. */
  custom?: boolean;
};

/** A size spec with its CAD-quoted materials price (₪, before add-ons). */
export type PricedShedSize = ShedSizeSpec & { price: number };

/** The catalogue's low-wall height; the roof rises from it (see ROOF). */
export const STANDARD_HEIGHT_CM = 220;

export const heightOf = (s: ShedSizeSpec) => s.heightCm ?? STANDARD_HEIGHT_CM;

export const SIZES: ShedSizeSpec[] = [
  { label: "2x2", widthCm: 200, depthCm: 200 },
  { label: "3x2", widthCm: 300, depthCm: 200 },
  { label: "3x2.5", widthCm: 300, depthCm: 250 },
  { label: "3x3", widthCm: 300, depthCm: 300 },
  { label: "4x2", widthCm: 400, depthCm: 200 },
  { label: "3x4", widthCm: 300, depthCm: 400 },
];

export const ROOF = { high: 230, low: 220 };

/**
 * The optional pine-deck floor ("במת דק מעץ אורן מלא") is priced by footprint,
 * not flat: a clean 400 ₪/m² — the published market rate (mygan.co.il states it
 * outright; hamechola/toprosol sit in the same ~350–420 ₪/m² band). Derived from
 * the footprint so it can never drift from the dimensions shown.
 */
export const FLOOR_ILS_PER_SQM = 400;

export const floorPriceFor = (s: ShedSizeSpec) =>
  Math.round(((s.widthCm * s.depthCm) / 10000) * FLOOR_ILS_PER_SQM);

/**
 * Shipping (הובלה בלבד) is flat regardless of shed size — competitor-verified
 * 7/2026: panelil.co.il charges ₪450 (גדרה–חדרה) for every size from 3x2 to
 * 5x4. Installation is only sold bundled with shipping (הובלה והרכבה) — neither
 * panelil nor hamechola offers assembly without delivery.
 */
export const SHIPPING_ILS = 450;

/**
 * הובלה והרכבה scales with footprint. Every tier here is a price we actually
 * verified 7/2026 against panelil.co.il (hamechola matches at the ₪2,350 tier):
 * ₪2,350 up to 9m² (3x2 … 3x3/4x2), ₪2,840 at 12m² (3x4), ₪3,150 at 20m² (5x4).
 *
 * Beyond 20m² we have no verified price, so this returns null and the storefront
 * hides the option and points the customer at us — it never extrapolates a
 * fourth tier. Custom footprints from the CAD planner can land anywhere in this
 * range, which is exactly why the ceiling is explicit.
 */
const INSTALL_TIERS: { maxSqm: number; price: number }[] = [
  { maxSqm: 9, price: 2350 },
  { maxSqm: 12, price: 2840 },
  { maxSqm: 20, price: 3150 },
];

export const footprintSqm = (s: ShedSizeSpec) => (s.widthCm * s.depthCm) / 10000;

export const deliveryInstallPriceFor = (s: ShedSizeSpec): number | null =>
  INSTALL_TIERS.find((t) => footprintSqm(s) <= t.maxSqm)?.price ?? null;

/**
 * Bounds for a custom footprint arriving from the CAD planner
 * (/?width=&length=&height=, in cm). Deliberately narrower than CAD's own
 * engineering clamp (10–1000cm): this is the range we actually sell as a shed
 * and can price end-to-end. Anything outside is refused rather than quoted.
 */
export const CUSTOM_LIMITS = {
  minCm: 150,
  maxCm: 500,
  minHeightCm: 180,
  maxHeightCm: 300,
  maxSqm: INSTALL_TIERS[INSTALL_TIERS.length - 1].maxSqm,
};

/** Meters, trimmed: 250 → "2.5", 300 → "3". */
export const metersLabel = (cm: number) => String(Number((cm / 100).toFixed(2)));

export const customSizeLabel = (widthCm: number, depthCm: number) =>
  `${metersLabel(widthCm)}x${metersLabel(depthCm)}`;

export const productTitle = (sizeLabel: string) =>
  `מחסן גינה פאנל מבודד ${sizeLabel} מטר`;
