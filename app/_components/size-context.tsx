"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Shares the selected shed size across the page so the config panel (price +
 * title) and the description's dimensions block stay in sync from one source.
 */
type SizeCtx = { sizeIndex: number; setSizeIndex: (i: number) => void };

const Ctx = createContext<SizeCtx | null>(null);

export function SizeProvider({ children }: { children: ReactNode }) {
  const [sizeIndex, setSizeIndex] = useState(0);
  return <Ctx.Provider value={{ sizeIndex, setSizeIndex }}>{children}</Ctx.Provider>;
}

export function useSize(): SizeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSize must be used within a SizeProvider");
  return c;
}
