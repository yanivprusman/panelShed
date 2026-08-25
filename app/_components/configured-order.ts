"use client";

import { useCallback, useMemo } from "react";
import { useSize } from "./size-context";
import { productTitle, floorPriceFor, deliveryInstallPriceFor } from "./sizes";
import { sizeSummary, type OptionChoice as Choice } from "./planner";

/**
 * The order currently on screen, in numbers AND in words — derived once, read
 * by everything that quotes it.
 *
 * This lived inside the buy panel while the panel was the only thing that
 * quoted a price. It no longer is: the WhatsApp chooser (see
 * ./whatsapp-chooser.tsx) offers to send the configured shed from the header,
 * the footer and the floating button, all of which sit outside the card. A
 * second copy of "what does this cost and what is in it" is how the price in a
 * customer's WhatsApp message ends up disagreeing with the price he was looking
 * at when he sent it — an argument you lose in front of the customer. So there
 * is one copy, here.
 */

export const ils = (n: number) => `₪ ${n.toLocaleString("he-IL")}`;

export function useConfiguredOrder() {
  const { size, options, sel, shareUrl } = useSize();

  const base = size.price;
  const title = productTitle(size.label);

  // Some add-ons (pine-deck floor, delivery+install) are priced by footprint,
  // not flat — their choice carries priceFromSize and the real price is derived
  // from the selected size.
  //
  // `available` is NOT the same as "price is null": "ללא (איסוף עצמי)" is free
  // (null price, available), while הובלה+הרכבה above the top competitor-verified
  // tier has no price we can stand behind and is genuinely unavailable. Keeping
  // them apart is what stops an unpriceable add-on from being sold for ₪0. Floor
  // is a ₪/m² formula, so it holds for any footprint.
  const resolve = useCallback(
    (c: Choice): { price: number | null; available: boolean } => {
      if (c.priceFromSize === "floor") {
        return { price: floorPriceFor(size), available: true };
      }
      if (c.priceFromSize === "deliveryInstall") {
        const p = deliveryInstallPriceFor(size);
        return { price: p, available: p !== null };
      }
      return { price: c.price, available: true };
    },
    [size],
  );

  // A size change could in principle pull the floor out from under the current
  // selection, so the effective choice is DERIVED rather than synced: an
  // unavailable selection reads as that group's first choice — always the "ללא"
  // one. Derived, so there is no window in which the displayed selection and the
  // priced one disagree.
  //
  // Today nothing can actually be unavailable: CUSTOM_LIMITS.maxSqm is derived
  // from the top install tier, so the storefront only ever offers a footprint it
  // can price end to end. This guard is kept deliberately — it is what stops a
  // ₪0 add-on from being sold if that ceiling is ever raised past the verified
  // tiers.
  const effSel = useMemo(
    () =>
      options.map((g, i) => {
        const idx = sel[i] ?? 0;
        const c = g.choices[idx];
        return c && resolve(c).available ? idx : 0;
      }),
    [options, sel, resolve],
  );

  const chosen = useMemo(
    () => options.map((g, i) => g.choices[effSel[i]] ?? g.choices[0]),
    [options, effSel],
  );

  const addons = chosen.reduce((s, c) => {
    const { price, available } = resolve(c);
    return s + (available ? (price ?? 0) : 0);
  }, 0);
  const total = base + addons;

  /**
   * The configuration in words — every line of it, the free choices included.
   *
   * "ריצפה: ללא" is as much of the order as "במת דק — ₪7,000": a shed quoted
   * without a floor and a shed nobody remembered to ask about a floor for read
   * identically once the word is missing, and that ambiguity is settled on the
   * phone, badly, days later. A priced choice speaks for itself and needs no
   * group name in front of it; a free one is only intelligible with it.
   *
   * The second line says whether this is the shed we sell or the shed he drew.
   * It is not decoration: the two are quoted from the same bill of materials and
   * print near-identical size lines, so without it the first question back is
   * always "רגע, זה מהאתר או משהו שתכננת?" — asked, on a real lead, after the
   * customer had already had to say "מתייחסת למחסן 2 על 2" unprompted. Read off
   * the shed itself rather than the selector's mode, so a design still being
   * priced (mode custom, catalogue shed on the card) describes the shed that is
   * actually on the card.
   */
  const configLines = useMemo(() => {
    const lines = [
      `${sizeSummary(size)} — ${ils(base)}`,
      size.custom ? "מידה שתכננתי במתכנן המחסן" : "דגם סטנדרטי מהקטלוג",
    ];
    chosen.forEach((c, i) => {
      const { price, available } = resolve(c);
      if (!available) return;
      const group = (options[i]?.label ?? "").replace(/\s*:\s*$/, "");
      lines.push(price != null ? `${c.label} — ${ils(price)}` : `${group}: ${c.label}`);
    });
    lines.push(`סה"כ ${ils(total)} כולל מע"מ`);
    return lines;
  }, [size, base, chosen, options, resolve, total]);

  /**
   * The whole order as a message body. The link that reproduces it is NOT
   * appended here — `whatsappUrl` appends it to every message it builds, so
   * that no message can ever go out without one (see ./contact.ts).
   */
  const configMessage = useMemo(
    () => ["שלום, אשמח לקבל פרטים על " + title, ...configLines].join("\n"),
    [title, configLines],
  );

  return {
    size,
    title,
    base,
    options,
    resolve,
    effSel,
    chosen,
    total,
    configLines,
    configMessage,
    /** The shop at exactly this configuration — the link that goes with the message. */
    shareUrl,
  };
}
