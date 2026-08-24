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
  shopConfigUrl,
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
 *   custom   — the shed the visitor designed in the CAD planner and came back
 *              with (/?design=<code>), priced live by /api/custom-quote from
 *              CAD's real bill of materials for THAT shed.
 *
 * Both legs of that planner trip also carry `cfg`, the whole configurator state
 * (see ./planner.ts), so add-on selections survive the detour.
 */
type CustomStatus =
  | { state: "none" }
  | { state: "loading" }
  /** Set when the shed is outside the range we routinely sell. It is priced and
   *  sold all the same — the caveat is said, not enforced. */
  | { state: "ready"; nonStandardSize?: boolean }
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
  /** This shop, at everything currently on screen — the link to send someone.
   *  Built from the same state as the price, so the two cannot disagree. */
  shareUrl: string;
  /** The CAD design being sold right now — the visitor's if they designed one,
   *  the catalogue shed's own otherwise. The identity everything else agrees on. */
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
  // Which copy of this shop the visitor is reading — sent to the planner so it
  // returns him HERE and not to the one registered production address. Read
  // after mount like every other browser-only fact below, so the server and the
  // first client render agree (see the deep-link effect).
  const [shopOrigin, setShopOrigin] = useState<string | null>(null);

  const setChoice = useCallback((groupIdx: number, choiceIdx: number) => {
    setSel((prev) => prev.map((v, i) => (i === groupIdx ? choiceIdx : v)));
  }, []);

  // Deep-link support, applied after mount to avoid an SSR/CSR hydration
  // mismatch (Googlebot renders JS, so it still sees the final price):
  //
  //   /?size=<label>            — a catalogue SKU, from the Merchant feed or a
  //                               Shopping ad.
  //   /?design=<code>           — the shed designed in the CAD planner, coming
  //                               back here to be bought. Priced live.
  //   /?width=&length=&height=  — a bare footprint with no shed behind it. Only
  //                               hand-made links arrive this way now; the
  //                               planner always sends its code instead.
  //   /?cfg=…                   — the configuration this visitor left with,
  //                               echoed back by the planner. Restored on all
  //                               of the above (see ./planner.ts).
  //
  // A design wins over size when both are present: the visitor just designed
  // that shed, so it's the more specific intent.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Browser-only facts, all read here on purpose: the server cannot know the
    // address this page is being read at any more than it can know the query.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShopOrigin(window.location.origin);

    // Everything the customer had configured before the planner detour.
    const config = decodeConfig(options, params.get(CONFIG_PARAM));
    if (config) {
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

    // A design code is the whole shed, its dimensions included; width/length is
    // only a footprint. The code wins outright when both are present — it is the
    // single source, and re-deriving the size from numbers sitting beside it is
    // how the two end up disagreeing.
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
          setCustomStatus({ state: "ready", nonStandardSize: data.nonStandardSize });
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
  // The shed on offer right now, as ONE identity: the visitor's design when
  // there is one, otherwise the catalogue shed's own. Everything that has to
  // agree about which shed this is — the price, the 3D frame, the planner link,
  // the order — reads this and only this, so none of them can be about a
  // different shed than the others.
  //
  // "custom" only sells a shed once it has a real price; until then (loading, or
  // a quote we couldn't get) the standard shed is what's priced on the card,
  // while the selector still shows the custom row plus its status note. That
  // one condition decides WHICH shed this is, so it is written once and every
  // reader below asks it rather than restating it.
  const sellingCustom = mode === "custom" && custom !== null;
  const size = sellingCustom ? custom : standard;
  const activeDesign = (sellingCustom ? designCode : standard?.designCode) ?? null;

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
      plannerUrl: buildPlannerUrl(
        size,
        options,
        { sizeLabel: standard.label, sel },
        activeDesign,
        shopOrigin,
      ),
      // `sellingCustom`, not `mode`: while a design is still being priced the
      // standard shed is what the card shows and charges for, and a link that
      // named the unpriced one would be a link to a different order than the
      // one on screen.
      shareUrl: shopConfigUrl(
        shopOrigin,
        options,
        { sizeLabel: standard.label, sel },
        sellingCustom ? { size, designCode: activeDesign } : null,
      ),
      designCode: activeDesign,
      embedUrl: plannerEmbedUrl(size, activeDesign),
    }),
    [standard, custom, mode, size, sellingCustom, customStatus, options, sel, setChoice, activeDesign, shopOrigin],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSize(): SizeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSize must be used within a SizeProvider");
  return c;
}
