"use client";

import { useMemo } from "react";
import { useConfiguredOrder, ils } from "./configured-order";
import { sizeSummary } from "./planner";
import { whatsappUrl } from "./contact";

/**
 * What the visitor can say when he opens WhatsApp — and why there is a choice
 * at all.
 *
 * Every generic WhatsApp button on this site used to pre-fill one sentence,
 * "שלום, אשמח לקבל פרטים על מחסני פאנל מבודד", and send it in a single tap. The
 * customer never really reads a message he did not write, so what arrived was a
 * lead with no size, no location, no link and nothing to answer — and the
 * conversation then cost three or four round trips before it could start. The
 * real ones are on record: "איזה מידות?" / "מה הכתובת?" typed out by hand, and
 * a customer volunteering "מתייחסת למחסן גינה פאנל מבודד 2 על 2" a full two
 * minutes after her opening line, because the opener she had just sent did not
 * say it.
 *
 * So the tap opens a short list instead. The first entry is the shed he is
 * looking at, priced, with every add-on he picked and whether it is ours or his
 * own design; the rest are the three things people actually write in about,
 * each ending in the one blank only he can fill.
 *
 * A choice is deliberately never a form: it is one tap to a message that is
 * already worth answering.
 */

export type WhatsAppChoice = {
  id: string;
  /** The row's headline — what he is asking about. */
  label: string;
  /** One quiet line under it, so the row can be picked without being read twice. */
  sub: string;
  /** The wa.me link, message and shop link already inside. */
  href: string;
  /** True for the row that carries the configuration on screen. */
  primary?: boolean;
  /** Lead value to report when this row is picked, when the row names a price. */
  value?: number;
};

export function useWhatsAppChoices(): WhatsAppChoice[] {
  const { size, title, total, configMessage, configLines, shareUrl } = useConfiguredOrder();

  return useMemo(() => {
    // Every message points at the shop AS HE LEFT IT — his shed, his add-ons —
    // not at the front page. He came back to a configured shop or he came back
    // to a stranger's.
    const link = shareUrl;

    return [
      {
        id: "configured",
        primary: true,
        label: "על המחסן שאני רואה עכשיו",
        // The size line and the price are exactly the card's, via
        // useConfiguredOrder — the row cannot advertise a different shed than
        // the message it sends.
        sub: `${sizeSummary(size)} · ${configLines[1]} · ${ils(total)}`,
        value: total,
        href: whatsappUrl(configMessage, { link }),
      },
      {
        id: "delivered-price",
        label: "מחיר סופי עד הבית",
        sub: "כולל הובלה והרכבה ליישוב שלי",
        value: total,
        href: whatsappUrl(
          `שלום, אשמח למחיר סופי ל${title}, כולל הובלה והרכבה עד אליי.`,
          { link, tail: "היישוב שלי:" },
        ),
      },
      {
        id: "custom-size",
        label: "מידה אחרת ממה שבאתר",
        sub: "מחסן, משרד או חדר עבודה במידות שלי",
        href: whatsappUrl(
          "שלום, אני מחפש מבנה מפאנל מבודד במידות אחרות מאלה שבאתר.",
          { link, tail: "המידות שאני צריך:" },
        ),
      },
      {
        id: "general",
        label: "שאלה כללית",
        sub: "זמן אספקה, תשלומים, אחריות",
        href: whatsappUrl(
          "שלום, יש לי כמה שאלות על המחסנים מפאנל מבודד — זמן אספקה, אפשרויות תשלום ואחריות.",
          { link },
        ),
      },
    ];
  }, [size, title, total, configMessage, configLines, shareUrl]);
}
