import type { CSSProperties } from "react";

/**
 * Inline SVG icons shared across the header, footer and purchase card. These
 * are presentational (no state/hooks), so they render in both server and
 * client components.
 */

/**
 * Brand mark: a shed whose "chimney" is a perfume atomizer spraying mist —
 * a visual pun on the name פאנל-שד ≈ פאנל בושם ("panel perfume"). White fills
 * with seam lines in the surrounding badge colour, so it drops straight into
 * the blue header badge (and mirrors app/icon.svg, the favicon). The wall's
 * horizontal seams nod to the insulated *panel* the product is made of.
 */
export function PanelShedMark({ size = 22, seam = "#2f8fd6" }: { size?: number; seam?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g fill="#ffffff" opacity="0.92">
        <circle cx="31" cy="5.6" r="1.7" />
        <circle cx="34.6" cy="3.4" r="1.2" />
        <circle cx="32.5" cy="1.9" r="0.95" />
        <circle cx="29" cy="2.9" r="1.1" />
      </g>
      <rect x="20" y="4" width="8" height="4.6" rx="2.1" fill="#ffffff" />
      <rect x="21.5" y="8" width="5" height="5.2" fill="#ffffff" />
      <polygon points="7,26 24,12 41,26" fill="#ffffff" />
      <rect x="12" y="26" width="24" height="14" rx="1.8" fill="#ffffff" />
      <g stroke={seam} strokeWidth="1.7" strokeLinecap="round">
        <line x1="13" y1="31" x2="35" y2="31" />
        <line x1="13" y1="35.4" x2="35" y2="35.4" />
      </g>
    </svg>
  );
}
export function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="#25D366" aria-hidden="true">
      <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.7 5.4 2 7.7L.5 31.5l8-2.1c2.2 1.2 4.8 1.9 7.5 1.9 8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5zm0 28c-2.4 0-4.7-.6-6.7-1.8l-.5-.3-4.7 1.2 1.3-4.6-.3-.5C3.6 20.3 3 18.2 3 16 3 8.8 8.8 3 16 3s13 5.8 13 13-5.8 12.5-13 12.5z" />
      <path d="M23.4 19.2c-.4-.2-2.3-1.1-2.6-1.3-.4-.1-.6-.2-.9.2s-1 1.3-1.2 1.5c-.2.2-.4.3-.8.1s-1.6-.6-3-1.9c-1.1-1-1.9-2.2-2.1-2.6s0-.6.2-.8c.2-.2.4-.4.5-.6.2-.2.2-.4.4-.6.1-.3 0-.5 0-.7s-.9-2.1-1.2-2.9c-.3-.7-.6-.6-.9-.6h-.7c-.2 0-.6.1-.9.5s-1.2 1.2-1.2 2.9 1.2 3.4 1.4 3.6c.2.2 2.4 3.7 5.8 5.1.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 2.1-.9 2.4-1.7.3-.8.3-1.5.2-1.7-.1-.1-.3-.2-.7-.4z" />
    </svg>
  );
}

export function PhoneIcon({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2f8fd6"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function CheckIcon({ size = 18 }: { size?: number }) {
  const style: CSSProperties = { flex: "0 0 auto", marginTop: 1 };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#2f8fd6"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
