"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SIZES } from "./sizes";

/**
 * Shares the selected shed size across the page so the config panel (price +
 * title) and the description's dimensions block stay in sync from one source.
 */
type SizeCtx = { sizeIndex: number; setSizeIndex: (i: number) => void };

const Ctx = createContext<SizeCtx | null>(null);

export function SizeProvider({ children }: { children: ReactNode }) {
  const [sizeIndex, setSizeIndex] = useState(0);

  // Deep-link support: /?size=<label> pre-selects that shed size, so a visitor
  // arriving from the Google Merchant feed / a Shopping ad lands on the exact
  // size they clicked — and the visible price matches the feed (Google rejects
  // feed↔landing-page price mismatches). Applied after mount to avoid an
  // SSR/CSR hydration mismatch; Googlebot renders JS so it sees the final price.
  useEffect(() => {
    const label = new URLSearchParams(window.location.search).get("size");
    if (!label) return;
    const i = SIZES.findIndex((s) => s.label === label);
    if (i >= 0) setSizeIndex(i);
  }, []);

  return <Ctx.Provider value={{ sizeIndex, setSizeIndex }}>{children}</Ctx.Provider>;
}

export function useSize(): SizeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSize must be used within a SizeProvider");
  return c;
}
