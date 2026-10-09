import "server-only";
import type { OrderLine } from "@/lib/orders";
import { resolveCatalogueSize, resolveDesignedSize } from "@/lib/sellable-size";
import { priceConfiguration, type ChoiceSelection, type PricedLine } from "@/app/_components/options";
import { productTitle, heightOf, type PricedShedSize } from "@/app/_components/sizes";

/**
 * WHICH SHED. A discriminated union rather than a bag of optional fields,
 * because "catalogue 2x2" and "the shed with this design code" are answered by
 * different price sources and confusing them is how one gets charged as the
 * other.
 */
export type ShedRef =
  | { kind: "catalogue"; sizeLabel: string }
  | { kind: "design"; designCode: string }
  /** Legacy /?width=&length=&height= links, which carry no design code. */
  | { kind: "footprint"; widthCm: number; depthCm: number; heightCm: number };

export type PricedOrder =
  | {
      ok: true;
      size: PricedShedSize;
      designCode?: string;
      title: string;
      /** The order in lines, written from what WE priced — never from the request. */
      lines: OrderLine[];
      /** Every option group with its choice, the free ones included ("חלון: ללא"). */
      choiceLines: PricedLine[];
      /** CAD flagged the footprint as outside the range we routinely build. */
      nonStandardSize: boolean;
      total: number;
    }
  | { ok: false; status: number; error: string; message?: string };

/**
 * The price of a shed + its add-ons, computed on the server from the same
 * sources the page renders from (CAD's bill of materials, OPTION_GROUPS).
 *
 * Shared by checkout and quotes on purpose: a quote that priced the shed one way
 * and a checkout that charged it another is the argument a quote exists to
 * prevent. Nothing about money is read off the request — only which shed and
 * which choices.
 */
export async function priceOrder(shed: unknown, choices: unknown): Promise<PricedOrder> {
  const ref = shed as ShedRef | undefined;
  if (!ref || typeof ref !== "object" || typeof ref.kind !== "string") {
    return { ok: false, status: 400, error: "missing_shed" };
  }

  const resolved =
    ref.kind === "catalogue"
      ? await resolveCatalogueSize(String(ref.sizeLabel ?? ""))
      : ref.kind === "design"
        ? await resolveDesignedSize({ designCode: String(ref.designCode ?? "") })
        : ref.kind === "footprint"
          ? await resolveDesignedSize({
              widthCm: Number(ref.widthCm),
              depthCm: Number(ref.depthCm),
              heightCm: Number(ref.heightCm),
            })
          : null;

  if (!resolved) return { ok: false, status: 400, error: "bad_shed_kind" };
  if (!resolved.ok) {
    return { ok: false, status: resolved.status, error: resolved.error, message: resolved.message };
  }

  const size = resolved.size;
  if (!choices || typeof choices !== "object" || Array.isArray(choices)) {
    return { ok: false, status: 400, error: "missing_choices" };
  }

  const priced = priceConfiguration(size, choices as ChoiceSelection);
  if (!priced.ok) {
    return { ok: false, status: 400, error: priced.error, message: priced.message };
  }

  // A custom size carries its exact dimensions so the build is made to what the
  // customer designed rather than to a rounded label.
  const lines: OrderLine[] = [
    {
      label: "גודל",
      choice: size.custom
        ? `${size.label} מטר (מידה מותאמת מהמתכנן: ${size.widthCm}×${size.depthCm}×${heightOf(size)} ס"מ)`
        : `${size.label} מטר`,
      price: size.price,
    },
    ...priced.lines
      .filter((l) => l.price != null)
      .map((l) => ({ label: "תוספת", choice: l.choiceLabel, price: l.price })),
  ];

  return {
    ok: true,
    size,
    designCode: resolved.designCode,
    title: productTitle(size.label),
    lines,
    choiceLines: priced.lines,
    nonStandardSize: !!resolved.nonStandardSize,
    total: priced.total,
  };
}
