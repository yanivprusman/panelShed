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
export type CustomStatus =
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

/** The state the page's address asks for, resolved on the server before the
 *  first paint (lib/deep-link.ts) — so the first thing on screen is the shed the
 *  link names, never the standard one standing in for it while a client fetch
 *  catches up. */
export type InitialSizeState = {
  standardIndex: number;
  mode: SizeMode;
  sel: number[];
  custom: PricedShedSize | null;
  designCode: string | null;
  customStatus: CustomStatus;
};

export function SizeProvider({
  sizes: catalogue,
  options,
  initial,
  children,
}: {
  sizes: PricedShedSize[];
  options: OptionGroup[];
  initial: InitialSizeState;
  children: ReactNode;
}) {
  // Everything the address asked for arrives already resolved; none of it
  // changes after load except by the visitor's own hand (mode, add-ons).
  const standardIndex = initial.standardIndex;
  const custom = initial.custom;
  const customStatus = initial.customStatus;
  const [mode, setMode] = useState<SizeMode>(initial.mode);
  const [sel, setSel] = useState<number[]>(initial.sel);
  // The designed shed we are showing and pricing, when there is one.
  const designCode = initial.designCode;
  // Which copy of this shop the visitor is reading — sent to the planner so it
  // returns him HERE and not to the one registered production address. Read
  // after mount like every other browser-only fact below, so the server and the
  // first client render agree (see the deep-link effect).
  const [shopOrigin, setShopOrigin] = useState<string | null>(null);

  const setChoice = useCallback((groupIdx: number, choiceIdx: number) => {
    setSel((prev) => prev.map((v, i) => (i === groupIdx ? choiceIdx : v)));
  }, []);

  // The address this page is being read at is a browser-only fact — the server
  // cannot know it — so it alone is read after mount. Everything else in the
  // query was resolved on the server (see InitialSizeState).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShopOrigin(window.location.origin);
  }, []);

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
