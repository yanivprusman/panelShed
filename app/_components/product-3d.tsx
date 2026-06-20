"use client";

import { useSize } from "./size-context";
import { SIZES } from "./sizes";

/**
 * The "מתכנן המחסן" block in the description: an interactive 3D view of the shed
 * in its garden (an embed of the CAD app's orbit-enabled viewer, ?embed=1),
 * sized to the currently-selected shed, with an overlaid link into the full
 * planner. Below the frame: the planner heading + explainer.
 */
const CAD_BASE =
  process.env.NEXT_PUBLIC_CAD_BASE_URL || "https://cad.prod.ya-niv.com";

export default function Product3D() {
  const { sizeIndex } = useSize();
  const s = SIZES[sizeIndex];
  // CAD convention: width × length (= depth) in cm; height = low wall (220).
  const src = `${CAD_BASE}/?embed=1&width=${s.widthCm}&length=${s.depthCm}&height=220`;
  // Full interactive planner (not the read-only embed), pre-set to this size.
  const plannerUrl = `${CAD_BASE}/?dcode=panel-shed&width=${s.widthCm}&length=${s.depthCm}&height=220`;

  const pill = {
    position: "absolute" as const,
    padding: "5px 11px",
    background: "rgba(20,20,20,.72)",
    borderRadius: 999,
    fontSize: 12,
    color: "#fff",
  };

  return (
    <div data-id="Product3D">
      <div
        data-id="product-3d-frame"
        style={{ position: "relative", background: "#dde7ea", borderRadius: 10, overflow: "hidden" }}
      >
        <iframe
          data-id="product-3d-iframe"
          className="cad-iframe"
          src={src}
          title="תצוגת תלת-ממד של המחסן בגינה"
          allow="fullscreen"
        />
        <span
          data-id="product-3d-badge"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            padding: "5px 10px",
            background: "#fff",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 800,
            color: "#2f8fd6",
            pointerEvents: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,.12)",
          }}
        >
          פאנל-שד
        </span>
        <a
          data-id="planner-link"
          href={plannerUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...pill,
            bottom: 10,
            right: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontWeight: 700,
            textDecoration: "none",
            zIndex: 2,
          }}
        >
          למתכנן המחסן ›
        </a>
        <span
          data-id="product-3d-hint"
          style={{ ...pill, bottom: 10, left: 10, fontWeight: 600, pointerEvents: "none" }}
        >
          תצוגת תלת-ממד · גררו לסיבוב
        </span>
      </div>

      <h2
        data-id="planner-heading"
        style={{ margin: "18px 0 0", fontSize: 21, fontWeight: 800, color: "#2f2f2f", textAlign: "right", paddingBottom: 6 }}
      >
        מתכנן המחסן
      </h2>
      <p data-id="planner-desc" style={{ margin: "12px 0 0", fontSize: 14.5, color: "#666", lineHeight: 1.7 }}>
        עצבו, תכננו ובנו את מחסן הפאנל המבודד שלכם — בחרו מידות, גובה ופתחים וצפו בתוצאה בתלת-ממד בזמן אמת,
        וקבלו תוכנית בנייה. נועד למי שרוצה לבנות בעצמו (DIY) או למי שרוצה להזמין מחסן במידות חריגות שאינן
        מופיעות במידות הסטנדרטיות.
      </p>
    </div>
  );
}
