"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useWhatsAppChoices, type WhatsAppChoice } from "./whatsapp-messages";
import { WhatsAppIcon } from "./icons";
import { reportLead } from "@/lib/gtag";

/**
 * The message chooser behind every generic WhatsApp button.
 *
 * ONE sheet for the whole page, opened from the header, the footer and the
 * floating button, because three copies of a modal is three places for the
 * open/close/Escape behaviour to drift apart — and because only one of them can
 * ever be open anyway.
 *
 * It lives inside SizeProvider (see app/page.tsx): the first row is the shed
 * currently on screen, which is a fact only that provider holds.
 */

const Ctx = createContext<{ open: () => void } | null>(null);

export function WhatsAppChooserProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const choices = useWhatsAppChoices();
  const firstRef = useRef<HTMLAnchorElement>(null);
  const close = useCallback(() => setOpen(false), []);

  // Escape closes, and the first row takes focus on open — the sheet is a
  // dialog, and a dialog you cannot leave by keyboard is a trap for exactly the
  // visitors who cannot leave it by tapping outside either.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    firstRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <Ctx.Provider value={{ open: () => setOpen(true) }}>
      {children}
      {open && (
        <div
          data-id="whatsapp-chooser-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="בחירת הודעה לוואטסאפ"
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            // Above the floating button (90) and the order modal's backdrop
            // (100) alike: it is opened from a control that sits over both.
            zIndex: 120,
            background: "rgba(0,0,0,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            data-id="whatsapp-chooser-box"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              background: "#fff",
              borderRadius: 14,
              padding: "22px 20px 18px",
              boxShadow: "0 20px 60px rgba(0,0,0,.3)",
              maxHeight: "88vh",
              overflowY: "auto",
              textAlign: "right",
            }}
          >
            <div
              data-id="whatsapp-chooser-head"
              style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}
            >
              <WhatsAppIcon size={22} />
              <h3
                data-id="whatsapp-chooser-title"
                style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#2f2f2f" }}
              >
                על מה תרצו לשאול?
              </h3>
            </div>
            <p
              data-id="whatsapp-chooser-sub"
              style={{ margin: "0 0 16px", fontSize: 13.5, lineHeight: 1.6, color: "#777" }}
            >
              בחרו שורה — ההודעה תיפתח בוואטסאפ כשהפרטים כבר בתוכה, כדי שלא נצטרך
              לשאול אתכם מה המידה ומאיפה אתם.
            </p>

            {choices.map((c, i) => (
              <ChoiceRow
                key={c.id}
                choice={c}
                anchorRef={i === 0 ? firstRef : undefined}
                onPick={close}
              />
            ))}

            <button
              type="button"
              data-id="whatsapp-chooser-cancel"
              onClick={close}
              style={{
                display: "block",
                width: "100%",
                marginTop: 6,
                padding: "10px 0",
                background: "none",
                border: "none",
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 600,
                color: "#8a8a8a",
                cursor: "pointer",
              }}
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

function ChoiceRow({
  choice,
  anchorRef,
  onPick,
}: {
  choice: WhatsAppChoice;
  anchorRef?: React.Ref<HTMLAnchorElement>;
  onPick: () => void;
}) {
  return (
    <a
      ref={anchorRef}
      data-id={`whatsapp-choice-${choice.id}`}
      href={choice.href}
      target="_blank"
      rel="noopener noreferrer"
      // The Google Ads Lead conversion fires HERE and not on the button that
      // opened this sheet: opening a chooser is not a lead, and a campaign
      // optimising for sheet-opens would buy the wrong clicks.
      onClick={() => {
        reportLead(choice.value != null ? { value: choice.value } : undefined);
        onPick();
      }}
      className={`wa-choice${choice.primary ? " wa-choice-primary" : ""}`}
    >
      <span data-id={`whatsapp-choice-label-${choice.id}`} className="wa-choice-label">
        {choice.label}
      </span>
      <span data-id={`whatsapp-choice-sub-${choice.id}`} className="wa-choice-sub">
        {choice.sub}
      </span>
    </a>
  );
}

/** Opens the shared chooser. Only valid under WhatsAppChooserProvider. */
export function useWhatsAppChooser() {
  const c = useContext(Ctx);
  if (!c)
    throw new Error("useWhatsAppChooser must be used within a WhatsAppChooserProvider");
  return c;
}
