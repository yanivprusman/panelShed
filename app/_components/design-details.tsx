"use client";

import { useCallback, useState, type CSSProperties } from "react";
import { useSize } from "./size-context";
import { heightOf } from "./sizes";
import type { DesignSpecRow } from "@/lib/cad-designs";

/**
 * "Full details" — the rest of the shed, under the simple configurator.
 *
 * The panel above sells the shed with the few things a buyer decides here: size,
 * add-ons, price. But a customer who came back from the planner made a dozen
 * other choices — which wall the door sits on, which way it swings, which side
 * the handle is, where the roof falls — and until now the storefront showed him
 * none of them. He had to trust that the shed being priced was the shed he drew.
 *
 * So this stays CLOSED by default (the simple view is the whole point) and
 * opens on demand, and only then does it cost a round trip. The rows come
 * finished from the planner in the planner's own words, so what he reads here
 * is what he chose there.
 *
 * The dimensions are OURS — the same numbers the block above shows, from the
 * same source — and the rest is the planner's. Neither side restates the
 * other's.
 */

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; rows: DesignSpecRow[] }
  | { phase: "error"; message: string };

const ACCENT = "#2f8fd6";

const toggleStyle = (open: boolean): CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 7,
  width: "100%",
  marginTop: 12,
  padding: "9px 12px",
  background: open ? "#eef5fb" : "#f5f7f8",
  border: `1px solid ${open ? "#cfe4f5" : "#d8dde0"}`,
  borderRadius: 8,
  fontFamily: "inherit",
  fontSize: 13.5,
  fontWeight: 700,
  color: open ? "#2a6a99" : "#555",
  cursor: "pointer",
  textAlign: "right",
});

const panelStyle: CSSProperties = {
  marginTop: 8,
  padding: "12px 13px",
  background: "#fbfcfd",
  border: "1px solid #e6ebee",
  borderRadius: 8,
  fontSize: 13.5,
  lineHeight: 1.6,
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "6px 0",
  borderBottom: "1px solid #eef1f3",
};

export function DesignDetails() {
  const { size, designCode, customStatus } = useSize();
  // The catalogue shed has a design behind it like any other, and its settings
  // are worth showing — but the buyer did not choose them, so it must not be
  // called "the shed you planned".
  const isOwnDesign = size.custom && customStatus.state === "ready";
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ phase: "idle" });

  // Fetched from the click, not from an effect: opening the panel IS the event,
  // and nothing else can make these rows needed. The mount site keys this
  // component by design code, so rows loaded for one shed can never survive
  // into another — the staleness an effect would exist to chase cannot arise.
  const load = useCallback(() => {
    if (!designCode) return;
    setState({ phase: "loading" });
    fetch(`/api/design-spec?design=${encodeURIComponent(designCode)}`)
      .then(async (res) => {
        const data = await res.json();
        setState(
          data.ok
            ? { phase: "ready", rows: data.rows }
            : { phase: "error", message: data.message },
        );
      })
      .catch(() =>
        setState({
          phase: "error",
          message: "לא הצלחנו להציג את פרטי המחסן כרגע. נסו שוב עוד רגע.",
        }),
      );
  }, [designCode]);

  const toggle = () => {
    // Re-opening after a failure tries again — the customer asking a second
    // time is a new request, not a second guess at the first one.
    if (!open && state.phase !== "ready") load();
    setOpen((v) => !v);
  };

  // Nothing to open: a bare footprint from an old hand-made link has no design
  // behind it, so there are no choices to show. Better no button than a button
  // that opens an empty box.
  if (!designCode) return null;

  return (
    <div data-id="design-details">
      <button
        data-id="design-details-toggle"
        type="button"
        aria-expanded={open}
        onClick={toggle}
        style={toggleStyle(open)}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = ACCENT)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = open ? "#cfe4f5" : "#d8dde0")}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            transition: "transform .15s",
            transform: open ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ‹
        </span>
        {open
          ? "הסתרת הפרטים המלאים"
          : isOwnDesign
            ? "כל הפרטים של המחסן שתכננתם"
            : "כל הפרטים של המחסן"}
      </button>

      {open && (
        <div data-id="design-details-panel" style={panelStyle}>
          <dl data-id="design-details-list" style={{ margin: 0 }}>
            <div data-id="design-detail-row" style={rowStyle}>
              <dt style={{ color: "#777" }}>מידות</dt>
              <dd data-id="design-detail-dimensions" style={{ margin: 0, fontWeight: 700, color: "#333" }}>
                {`רוחב ${size.widthCm} · עומק ${size.depthCm} · גובה ${heightOf(size)} ס"מ`}
              </dd>
            </div>

            {state.phase === "ready" &&
              state.rows.map((row, i) => (
                <div key={i} data-id="design-detail-row" style={rowStyle}>
                  <dt style={{ color: "#777" }}>{row.label}</dt>
                  <dd style={{ margin: 0, fontWeight: 700, color: "#333" }}>{row.value}</dd>
                </div>
              ))}
          </dl>

          {state.phase === "loading" && (
            <p data-id="design-details-loading" style={{ margin: "10px 0 0", color: "#777" }}>
              טוענים את פרטי המחסן…
            </p>
          )}
          {state.phase === "error" && (
            <p data-id="design-details-error" style={{ margin: "10px 0 0", color: "#a33" }}>
              {state.message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
