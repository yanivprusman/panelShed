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
};

/** A size spec with its CAD-quoted materials price (₪, before add-ons). */
export type PricedShedSize = ShedSizeSpec & { price: number };

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
 * הובלה והרכבה scales with footprint: both competitors charge ₪2,350 up to
 * 9m² (3x2 … 3x3/4x2); panelil then steps to ₪2,840 at 12m² (3x4) and ₪3,150
 * at 20m² (5x4). Our lineup tops out at 3x4, so one threshold covers it.
 */
export const deliveryInstallPriceFor = (s: ShedSizeSpec) =>
  (s.widthCm * s.depthCm) / 10000 > 9 ? 2840 : 2350;

export const productTitle = (sizeLabel: string) =>
  `מחסן גינה פאנל מבודד ${sizeLabel} מטר`;
