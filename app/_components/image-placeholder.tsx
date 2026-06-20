import type { CSSProperties } from "react";

/**
 * Static port of the design's <image-slot> custom element. The original is a
 * drag-to-fill placeholder backed by the claude.ai/design canvas runtime; in a
 * real Next.js page we render either a supplied image or a clean empty-state
 * placeholder (light fill + icon + optional caption) that mirrors the slot's
 * resting look. Pass `src` later to drop in a real product photo.
 */
type ImagePlaceholderProps = {
  src?: string;
  alt?: string;
  caption?: string;
  fit?: CSSProperties["objectFit"];
  iconSize?: number;
  style?: CSSProperties;
};

export default function ImagePlaceholder({
  src,
  alt = "",
  caption,
  fit = "cover",
  iconSize = 26,
  style,
}: ImagePlaceholderProps) {
  return (
    <div
      data-id="ImagePlaceholder"
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#f0f0f0",
        color: "rgba(0,0,0,0.42)",
        ...style,
        // Layout props come after `...style` so a caller's leftover
        // `display: block` (from the original markup) can't break centering.
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      {src ? (
        <img
          data-id="image-placeholder-img"
          src={src}
          alt={alt}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: fit,
            objectPosition: "center",
          }}
        />
      ) : (
        <>
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.5 }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          {caption ? (
            <span
              data-id="image-placeholder-caption"
              style={{
                maxWidth: "90%",
                padding: "0 8px",
                fontSize: 12,
                lineHeight: 1.35,
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              {caption}
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}
