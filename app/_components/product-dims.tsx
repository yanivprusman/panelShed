"use client";

import { useSize } from "./size-context";
import { SIZES, ROOF } from "./sizes";

/**
 * The "מידות המחסן" block in the description — reactive to the selected size.
 */
export default function ProductDims() {
  const { sizeIndex } = useSize();
  const s = SIZES[sizeIndex];
  const dims = [
    `גובה: חד שיפועי ${ROOF.high}\\${ROOF.low} ס"מ`,
    `רוחב: ${s.widthCm} ס"מ`,
    `עומק: ${s.depthCm} ס"מ`,
  ];
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontWeight: 700, textDecoration: "underline", marginBottom: 4 }}>
        מידות המחסן:
      </div>
      {dims.map((d, i) => (
        <div key={i} style={{ marginBottom: 2 }}>
          {d}
        </div>
      ))}
    </div>
  );
}
