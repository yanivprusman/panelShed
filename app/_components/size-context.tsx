"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PricedShedSize } from "./sizes";
import {
  CONFIG_PARAM,
  decodeConfig,
  plannerUrl as buildPlannerUrl,
  plannerEmbedUrl,
  type OptionGroup,
} from "./planner";

/**
 * The one source of the visitor's configuration — selected shed and add-ons —
 * shared by the buy panel (price + title), the dimensions block and the 3D
 * planner embed, so they can never disagree.
 *
 * The storefront sells two things, and the size selector offers exactly those:
 *
 *   standard — the catalogue shed. Normally the 2x2; a Shopping ad or the
 *              Merchant feed can deep-link another SKU with /?size=<label>,
 *              and then THAT one is the standard on this visit (the visible
 *              price has to equal the feed's, or Google disapproves the item).
 *   custom   — a footprint the visitor designed in the CAD planner and came
 *              back with (/?width=&length=&height=), priced live by
 *              /api/custom-quote from CAD's real bill of materials.
 *
 * Both legs of that planner trip also carry `cfg`, the whole configurator state
 * (see ./planner.ts), so add-on selections survive the detour.
 */
type CustomStatus =
  | { state: "none" }
  | { state: "loading" }
  | { state: "ready" }
  | { state: "error"; message: string };

export type SizeMode = "standard" | "custom";

type SizeCtx = {
  /** The catalogue shed on offer this visit. */
  standard: PricedShedSize;
  /** The planner-designed shed, once priced. Null until then. */
  custom: PricedShedSize | null;
  mode: SizeMode;
  setMode: (m: SizeMode) => void;
  /** The shed actually being sold right now. */
  size: PricedShedSize;
  customStatus: CustomStatus;
  options: OptionGroup[];
  /** Chosen choice index per option group. */
  sel: number[];
  setChoice: (groupIdx: number, choiceIdx: number) => void;
  /** Full planner deep-link for the current configuration (the outbound leg). */
  plannerUrl: string;
  /** The designed shed on show, if the visitor came back from the planner. */
  designCode: string | null;
  /** The 3D embed for what is actually being sold right now. */
  embedUrl: string;
};

const Ctx = createContext<SizeCtx | null>(null);

export function SizeProvider({
  sizes: catalogue,
  options,
  children,
}: {
  sizes: PricedShedSize[];
  options: OptionGroup[];
  children: ReactNode;
}) {
  const [standardIndex, setStandardIndex] = useState(0);
  const [mode, setMode] = useState<SizeMode>("standard");
  const [custom, setCustom] = useState<PricedShedSize | null>(null);
  const [customStatus, setCustomStatus] = useState<CustomStatus>({ state: "none" });
  const [sel, setSel] = useState<number[]>(() => options.map(() => 0));
  // The designed shed we are showing and pricing, when there is one.
  const [designCode, setDesignCode] = useState<string | null>(null);

  const setChoice = useCallback((groupIdx: number, choiceIdx: number) => {
    setSel((prev) => prev.map((v, i) => (i === groupIdx ? choiceIdx : v)));
  }, []);

  // Deep-link support, applied after mount to avoid an SSR/CSR hydration
  // mismatch (Googlebot renders JS, so it still sees the final price):
  //
  //   /?size=<label>            — a catalogue SKU, from the Merchant feed or a
  //                               Shopping ad.
  //   /?width=&length=&height=  — a footprint designed in the CAD planner,
  //                               coming back here to be bought. Priced live.
  //   /?cfg=…                   — the configuration this visitor left with,
  //                               echoed back by the planner. Restored on both
  //                               of the above (see ./planner.ts).
  //
  // width/length win over size when both are present: the visitor just designed
  // that shed, so it's the more specific intent.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Everything the customer had configured before the planner detour.
    const config = decodeConfig(options, params.get(CONFIG_PARAM));
    if (config) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSel(config.sel);
    }

    // The catalogue SKU: an explicit ?size= wins, otherwise the one carried
    // through the round trip, so returning from the planner and switching back
    // to "standard" lands on the shed they started from.
    const label = params.get("size") ?? config?.sizeLabel;
    if (label) {
      const i = catalogue.findIndex((s) => s.label === label);
      if (i >= 0) setStandardIndex(i);
    }

    // A design code is the whole shed; width/length is only a footprint. The
    // code wins when both are present — the planner sends both, the three
    // numbers so we can label and vet the shed, the code so we price and show
    // the one he actually designed.
    const design = params.get("design");
    const width = params.get("width");
    const length = params.get("length");
    if (!design && (!width || !length)) return;

    const query = new URLSearchParams();
    if (design) {
      query.set("design", design);
    } else {
      query.set("width", width!);
      query.set("length", length!);
      const height = params.get("height");
      if (height) query.set("height", height);
    }

    let cancelled = false;
    // Kicking off external work on mount — and the visitor must see that we're
    // pricing their design rather than a stale standard shed for the second or
    // two the CAD quote takes.
    setCustomStatus({ state: "loading" });
    setMode("custom");
    fetch(`/api/custom-quote?${query.toString()}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (data.ok) {
          setCustom(data.size);
          setDesignCode(data.designCode ?? null);
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
  }, [catalogue, options]);

  const standard = catalogue[standardIndex] ?? catalogue[0];
  // "custom" only sells a shed once it has a real price; until then (loading, or
  // a quote we couldn't get) the standard shed is what's priced on the card,
  // while the selector still shows the custom row plus its status note.
  const size = mode === "custom" && custom ? custom : standard;

  const value = useMemo<SizeCtx>(
    () => ({
      standard,
      custom,
      mode,
      setMode,
      size,
      customStatus,
      options,
      sel,
      setChoice,
      plannerUrl: buildPlannerUrl(size, options, { sizeLabel: standard.label, sel }),
      designCode: mode === "custom" ? designCode : null,
      // Only the custom shed has a design behind it; switching back to a
      // catalogue SKU must show that SKU, not the shed he designed.
      embedUrl: plannerEmbedUrl(size, mode === "custom" ? designCode : null),
    }),
    [standard, custom, mode, size, customStatus, options, sel, setChoice, designCode],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSize(): SizeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSize must be used within a SizeProvider");
  return c;
}
