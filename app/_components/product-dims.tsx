"use client";

import { useSize } from "./size-context";
import { heightOf } from "./sizes";

/**
 * The boxed "מידות המחסן" block in the description — reactive to the selected
 * size, including a custom footprint designed in the CAD planner. Light panel
 * (#f7f9fb) with one dimension per ruled row.
 */
export default function ProductDims() {
  const { size: s } = useSize();
  const dims = [
    `גובה: ${heightOf(s)} ס"מ`,
    `רוחב: ${s.widthCm} ס"מ`,
    `עומק: ${s.depthCm} ס"מ`,
  ];
  return (
    <div
      data-id="ProductDims"
      style={{
        border: "1px solid #e8e8e8",
        borderRadius: 10,
        background: "#f7f9fb",
        padding: "18px 20px",
        marginTop: 6,
        maxWidth: 380,
      }}
    >
      <div data-id="product-dims-title" style={{ fontWeight: 800, color: "#2f2f2f", fontSize: 15, marginBottom: 4 }}>
        מידות המחסן
      </div>
      {dims.map((d, i) => (
        <div
          key={i}
          data-id={`product-dim-${i}`}
          style={{ padding: "9px 0", borderTop: "1px solid #e7ecef", fontSize: 14.5, color: "#555" }}
        >
          {d}
        </div>
      ))}
    </div>
  );
}
