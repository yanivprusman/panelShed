"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PricedShedSize } from "./sizes";

/**
 * Shares the selected shed size across the page so the config panel (price +
 * title), the dimensions block and the 3D planner embed stay in sync from one
 * source — including a custom size designed in the CAD planner.
 *
 * `sizes` starts as the six server-priced catalogue SKUs and gains a seventh,
 * auto-selected entry when the visitor arrives back from the planner with
 * /?width=&length=&height=. That custom size is priced by /api/custom-quote
 * (which asks CAD for a real bill of materials), never by this component.
 */
type CustomStatus =
  | { state: "none" }
  | { state: "loading" }
  | { state: "ready" }
  | { state: "error"; message: string };

type SizeCtx = {
  sizes: PricedShedSize[];
  sizeIndex: number;
  setSizeIndex: (i: number) => void;
  size: PricedShedSize;
  customStatus: CustomStatus;
};

const Ctx = createContext<SizeCtx | null>(null);

export function SizeProvider({
  sizes: catalogue,
  children,
}: {
  sizes: PricedShedSize[];
  children: ReactNode;
}) {
  const [sizeIndex, setSizeIndex] = useState(0);
  const [custom, setCustom] = useState<PricedShedSize | null>(null);
  const [customStatus, setCustomStatus] = useState<CustomStatus>({ state: "none" });

  const sizes = useMemo(
    () => (custom ? [...catalogue, custom] : catalogue),
    [catalogue, custom],
  );

  // Deep-link support, applied after mount to avoid an SSR/CSR hydration
  // mismatch (Googlebot renders JS, so it still sees the final price):
  //
  //   /?size=<label>            — a catalogue SKU, from the Merchant feed or a
  //                               Shopping ad. The visible price must match the
  //                               feed, or Google disapproves the item.
  //   /?width=&length=&height=  — a footprint designed in the CAD planner,
  //                               coming back here to be bought. Priced live.
  //
  // width/length win when both are present: the visitor just designed that
  // shed, so it's the more specific intent.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const width = params.get("width");
    const length = params.get("length");

    if (width && length) {
      const query = new URLSearchParams({ width, length });
      const height = params.get("height");
      if (height) query.set("height", height);

      let cancelled = false;
      // Kicking off external work on mount — and the visitor must see that we're
      // pricing their design rather than a stale 2x2 for the second or two the
      // CAD quote takes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomStatus({ state: "loading" });
      fetch(`/api/custom-quote?${query.toString()}`)
        .then(async (res) => {
          const data = await res.json();
          if (cancelled) return;
          if (data.ok) {
            // Select it in the same update that adds it — it's what the visitor
            // came back to buy, and folding the two together avoids a render
            // where the custom size exists but isn't chosen.
            setCustom(data.size);
            setSizeIndex(catalogue.length);
            setCustomStatus({ state: "ready" });
          } else {
            setCustomStatus({ state: "error", message: data.message });
          }
        })
        .catch(() => {
          if (cancelled) return;
          setCustomStatus({
            state: "error",
            message:
              "לא הצלחנו לתמחר את המידות האלה כרגע. נסו שוב עוד רגע או דברו איתנו בוואטסאפ.",
          });
        });
      return () => {
        cancelled = true;
      };
    }

    const label = params.get("size");
    if (!label) return;
    const i = catalogue.findIndex((s) => s.label === label);
    if (i >= 0) setSizeIndex(i);
  }, [catalogue]);

  const value = useMemo<SizeCtx>(
    () => ({
      sizes,
      sizeIndex,
      setSizeIndex,
      size: sizes[sizeIndex] ?? sizes[0],
      customStatus,
    }),
    [sizes, sizeIndex, customStatus],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSize(): SizeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSize must be used within a SizeProvider");
  return c;
}
