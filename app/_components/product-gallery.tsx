"use client";

import { useEffect, useState, type CSSProperties } from "react";
import ImagePlaceholder from "./image-placeholder";

/**
 * Interactive product gallery (ported from the design's static gallery slot).
 * - Clicking a thumbnail swaps the main image.
 * - Side arrows cycle through the images.
 * - The magnifying-glass button (and clicking the main image) opens a
 *   full-screen lightbox with prev/next + Esc/arrow-key navigation.
 * Pure inline styles to match the rest of the page; no external deps.
 */
export default function ProductGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const multi = images.length > 1;

  const next = () => setActive((i) => (i + 1) % images.length);
  const prev = () => setActive((i) => (i - 1 + images.length) % images.length);

  // Keyboard control + body scroll-lock while the lightbox is open.
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
      else if (e.key === "ArrowLeft") next();
      else if (e.key === "ArrowRight") prev();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [zoomed, images.length]);

  const arrowBtn: CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 30,
    height: 46,
    background: "#f3f3f3",
    border: "1px solid #e2e2e2",
    color: "#9a9a9a",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    zIndex: 2,
  };

  const lightboxBtn: CSSProperties = {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "rgba(255,255,255,.12)",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    fontSize: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div>
      {/* Main image */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          aria-label="הגדל תמונה"
          onClick={() => setZoomed(true)}
          style={{
            display: "block",
            width: "100%",
            padding: 0,
            border: "none",
            background: "none",
            cursor: "zoom-in",
          }}
        >
          <ImagePlaceholder
            src={images[active]}
            alt={alt}
            iconSize={34}
            style={{ display: "block", width: "100%", height: 370, borderRadius: 2 }}
          />
        </button>

        {multi && (
          <>
            <button type="button" aria-label="הקודם" onClick={prev} style={{ ...arrowBtn, right: -14 }}>
              &#8250;
            </button>
            <button type="button" aria-label="הבא" onClick={next} style={{ ...arrowBtn, left: -14 }}>
              &#8249;
            </button>
          </>
        )}

        <button
          type="button"
          aria-label="הגדל תמונה"
          onClick={() => setZoomed(true)}
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "rgba(255,255,255,.85)",
            border: "1px solid #ddd",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            zIndex: 2,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7a7a7a" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
        </button>
      </div>

      {/* Thumbnails */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        {images.map((img, i) => (
          <button
            type="button"
            key={img + i}
            aria-label={`תמונה ${i + 1}`}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            style={{
              flex: 1,
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
              display: "block",
            }}
          >
            <ImagePlaceholder
              src={img}
              alt=""
              iconSize={18}
              style={{
                display: "block",
                width: "100%",
                height: 62,
                border: i === active ? "2px solid #b9b9b9" : "1px solid #e6e6e6",
                borderRadius: 2,
              }}
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setZoomed(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <button
            type="button"
            aria-label="סגור"
            onClick={() => setZoomed(false)}
            style={{ ...lightboxBtn, top: 16, left: 16, fontSize: 22 }}
          >
            &#10005;
          </button>

          {multi && (
            <>
              <button
                type="button"
                aria-label="הקודם"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                style={{ ...lightboxBtn, right: 24 }}
              >
                &#8250;
              </button>
              <button
                type="button"
                aria-label="הבא"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                style={{ ...lightboxBtn, left: 24 }}
              >
                &#8249;
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[active]}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "92vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 2 }}
          />

          {multi && (
            <span
              dir="ltr"
              style={{
                position: "absolute",
                bottom: 20,
                left: 0,
                right: 0,
                textAlign: "center",
                color: "rgba(255,255,255,.8)",
                fontSize: 14,
              }}
            >
              {active + 1} / {images.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
