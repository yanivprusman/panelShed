import "server-only";
import { cache } from "react";
import { STANDARD_HEIGHT_CM, type PricedShedSize } from "@/app/_components/sizes";
import { CONFIG_PARAM, decodeConfig, sizeSummary, type OptionGroup } from "@/app/_components/planner";
import type { InitialSizeState } from "@/app/_components/size-context";
import { resolveDesignedSize } from "@/lib/sellable-size";
import { getPricedSizes } from "@/lib/cad-quote";
import { OPTION_GROUPS } from "@/app/_components/options";

/**
 * What the page's own address asks for, resolved BEFORE the first byte is sent.
 *
 *   /?size=<label>            — a catalogue SKU, from the Merchant feed or a
 *                               Shopping ad.
 *   /?design=<code>           — the shed designed in the CAD planner, coming
 *                               back here to be bought (or a link someone was
 *                               sent). Priced here, on the server.
 *   /?width=&length=&height=  — a bare footprint with no shed behind it. Only
 *                               hand-made links arrive this way now.
 *   /?cfg=…                   — the add-ons the visitor had chosen (see
 *                               ../app/_components/planner.ts).
 *
 * This used to happen in a client effect after hydration. On a slow phone that
 * was ~9 s (measured 2026-10-21, a shared link to a 1x2 design) during which the
 * page confidently showed the standard 2x2, its price and its 3D model — which
 * reads as "the configuration I sent was lost", not as "loading". Resolving it
 * here means the very first paint is the shed the link names; there is no
 * moment in which the page shows another one.
 *
 * A design code wins over size when both are present: the visitor designed that
 * shed, so it's the more specific intent.
 */
export async function resolveDeepLink(
  params: Record<string, string | string[] | undefined>,
  catalogue: PricedShedSize[],
  options: OptionGroup[],
): Promise<InitialSizeState> {
  const one = (k: string) => {
    const v = params[k];
    return (Array.isArray(v) ? v[0] : v) ?? null;
  };

  const config = decodeConfig(options, one(CONFIG_PARAM));
  const label = one("size") ?? config?.sizeLabel;
  const i = label ? catalogue.findIndex((s) => s.label === label) : -1;

  const initial: InitialSizeState = {
    standardIndex: i >= 0 ? i : 0,
    mode: "standard",
    sel: config?.sel ?? options.map(() => 0),
    custom: null,
    designCode: null,
    customStatus: { state: "none" },
  };

  // A design code is the whole shed, its dimensions included; width/length is
  // only a footprint. The code wins outright when both are present.
  const design = one("design");
  const width = one("width");
  const length = one("length");
  if (!design && (!width || !length)) return initial;

  // From here on the visitor is looking at THEIR shed — or, if it cannot be
  // priced, at the custom row with the reason beside it. Never at the standard
  // shed presented as if it were what the link named.
  initial.mode = "custom";
  const height = one("height");
  try {
    const resolved = await resolveDesignedSize(
      design
        ? { designCode: design }
        : {
            widthCm: Number(width),
            depthCm: Number(length),
            heightCm: height === null ? STANDARD_HEIGHT_CM : Number(height),
          },
    );
    if (!resolved.ok) {
      return { ...initial, customStatus: { state: "error", message: resolved.message } };
    }
    return {
      ...initial,
      custom: resolved.size,
      designCode: resolved.designCode ?? null,
      customStatus: { state: "ready", nonStandardSize: resolved.nonStandardSize },
    };
  } catch (err) {
    console.error(`[deep-link] pricing ${design ?? `${width}x${length}`} failed:`, err);
    return {
      ...initial,
      customStatus: {
        state: "error",
        message:
          "לא הצלחנו לתמחר את המידות האלה כרגע. נסו שוב עוד רגע או דברו איתנו בוואטסאפ.",
      },
    };
  }
}

type PageParams = Record<string, string | string[] | undefined>;

/** One resolution per request, shared by the page and its metadata. Keyed by
 *  the query as a string, because React's cache compares arguments by identity
 *  and the two callers each get their own searchParams object. */
const resolvePageByQuery = cache(async (query: string) => {
  const sizes = await getPricedSizes();
  const params = Object.fromEntries(new URLSearchParams(query));
  return { sizes, initial: await resolveDeepLink(params, sizes, OPTION_GROUPS) };
});

export function resolvePage(params: PageParams) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const first = Array.isArray(v) ? v[0] : v;
    if (first !== undefined) q.set(k, first);
  }
  q.sort();
  return resolvePageByQuery(q.toString());
}

/**
 * What a link to this page is ABOUT, in words — the tab title and the preview
 * WhatsApp draws for a shared link. Same shed as the page shows: the designed
 * one when the link names a design that priced, otherwise the catalogue shed.
 * A link whose whole point is "here is the 1x2 I drew" must not be previewed
 * as "2x2".
 */
export function describeShed(
  sizes: PricedShedSize[],
  initial: InitialSizeState,
): { size: PricedShedSize; designed: boolean; summary: string; addOns: string[] } {
  const designed = initial.mode === "custom" && initial.custom !== null;
  const size = designed ? initial.custom! : (sizes[initial.standardIndex] ?? sizes[0]);
  // Only the add-ons actually chosen — the first choice of every group is its
  // "none"/included default, and listing those would say nothing.
  const addOns = OPTION_GROUPS.flatMap((g, i) => {
    const idx = initial.sel[i] ?? 0;
    return idx > 0 && g.choices[idx] ? [g.choices[idx].label] : [];
  });
  return { size, designed, summary: sizeSummary(size), addOns };
}
