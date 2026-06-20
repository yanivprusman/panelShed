"use client";

import { useSize } from "./size-context";
import { SIZES } from "./sizes";

/**
 * Interactive 3D view of the shed in its garden — an embed of the CAD app's
 * orbit-enabled viewer (?embed=1), sized to the currently-selected shed.
 * Replaces the old marketing video; users can orbit/zoom the model.
 */
const CAD_BASE =
  process.env.NEXT_PUBLIC_CAD_BASE_URL || "https://cad.dev.ya-niv.com";

export default function Product3D() {
  const { sizeIndex } = useSize();
  const s = SIZES[sizeIndex];
  // CAD convention: width × length (= depth) in cm; height = low wall (220).
  const src = `${CAD_BASE}/?embed=1&width=${s.widthCm}&length=${s.depthCm}&height=220`;

  return (
    <div style={{ position: "relative", background: "#e8eef0", borderRadius: 2, overflow: "hidden" }}>
      <iframe
        src={src}
        title="תצוגת תלת-ממד של המחסן בגינה"
        allow="fullscreen"
        style={{ display: "block", width: "100%", height: 430, border: 0 }}
      />
      <span
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          padding: "5px 9px",
          background: "#fff",
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 800,
          color: "#2f8fd6",
          pointerEvents: "none",
        }}
      >
        פאנל-שד
      </span>
      <span
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          padding: "4px 10px",
          background: "rgba(20,20,20,.72)",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          color: "#fff",
          pointerEvents: "none",
        }}
      >
        תצוגת תלת-ממד · גררו לסיבוב
      </span>
    </div>
  );
}
