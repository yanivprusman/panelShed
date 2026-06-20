/**
 * The shed sizes the storefront sells, with base prices (₪, before add-ons).
 * Label is "<width>x<depth>" in meters; widthCm/depthCm feed the dimensions
 * block. Roof is a single-slope 230→220cm across all sizes.
 */
export type ShedSize = {
  label: string;
  widthCm: number;
  depthCm: number;
  price: number;
};

export const SIZES: ShedSize[] = [
  { label: "2x2", widthCm: 200, depthCm: 200, price: 4150 },
  { label: "3x2", widthCm: 300, depthCm: 200, price: 5050 },
  { label: "3x2.5", widthCm: 300, depthCm: 250, price: 5650 },
  { label: "3x3", widthCm: 300, depthCm: 300, price: 5950 },
  { label: "4x2", widthCm: 400, depthCm: 200, price: 5950 },
  { label: "3x4", widthCm: 300, depthCm: 400, price: 6650 },
];

export const ROOF = { high: 230, low: 220 };

export const productTitle = (sizeLabel: string) =>
  `מחסן גינה פאנל מבודד ${sizeLabel} מטר`;
