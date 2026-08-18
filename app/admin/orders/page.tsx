import { listOrders, type Order, type PaymentStatus } from "@/lib/orders";
import { designUrl } from "@/app/_components/planner";
import { SIZES } from "@/app/_components/sizes";
import { quoteDesignProfit, type DesignProfitQuote } from "@/lib/cad-quote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "הזמנות | פאנל-שד", robots: { index: false } };

const ils = (n: number | null | undefined) =>
  typeof n === "number" ? `₪ ${n.toLocaleString("he-IL")}` : "—";

const STATUS: Record<PaymentStatus, { label: string; color: string }> = {
  paid: { label: "שולם", color: "#1e9e54" },
  pending: { label: "ממתין", color: "#d39e00" },
  failed: { label: "נכשל", color: "#c0392b" },
};

const cell: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #eee",
  fontSize: 13.5,
  verticalAlign: "top",
  textAlign: "right",
};
const th: React.CSSProperties = { ...cell, fontWeight: 700, color: "#555", background: "#fafafa", whiteSpace: "nowrap" };

function Gate({ message }: { message: string }) {
  return (
    <main data-id="admin-gate" dir="rtl" style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "inherit" }}>
      <p data-id="admin-gate-message" style={{ color: "#777", fontSize: 15 }}>{message}</p>
    </main>
  );
}

function fmtDate(iso: string): string {
  // Avoid locale/runtime drift: render the stored ISO compactly.
  return iso.replace("T", " ").slice(0, 16);
}

/**
 * Materials profit per design, for the admin's eyes: CAD's quote with the
 * panel-shed distributor token. Each design either resolves to numbers or to
 * the error that stopped it — an unreachable CAD or a stale token shows AS
 * an error in its cell, it never silently drops the column.
 */
type ProfitCell = { quote: DesignProfitQuote } | { error: string };

async function quoteProfits(designCodes: string[]): Promise<Map<string, ProfitCell>> {
  const unique = [...new Set(designCodes)];
  const cells = await Promise.all(
    unique.map(async (code): Promise<[string, ProfitCell]> => {
      try {
        return [code, { quote: await quoteDesignProfit(code) }];
      } catch (e) {
        return [code, { error: e instanceof Error ? e.message : String(e) }];
      }
    }),
  );
  return new Map(cells);
}

function ProfitValue({ cell }: { cell: ProfitCell | undefined }) {
  if (!cell) return <span style={{ color: "#bbb" }}>—</span>;
  if ("error" in cell) {
    return (
      <span data-id="profit-error" title={cell.error} style={{ color: "#c0392b", fontSize: 12 }}>
        שגיאה
      </span>
    );
  }
  const q = cell.quote;
  if (q.profit === null) {
    return (
      <span
        data-id="profit-missing-costs"
        title={`חסרה עלות עבור: ${q.missingCosts.join(", ")}`}
        style={{ color: "#d39e00", fontSize: 12, whiteSpace: "nowrap" }}
      >
        חסרות עלויות ({q.missingCosts.length})
      </span>
    );
  }
  return (
    <span
      data-id="profit-value"
      dir="ltr"
      style={{ color: q.profit >= 0 ? "#1e9e54" : "#c0392b", fontWeight: 700, whiteSpace: "nowrap" }}
    >
      {ils(q.profit)}
    </span>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return <Gate message="ניהול הזמנות אינו מוגדר (חסר ADMIN_TOKEN)." />;
  const { key } = await searchParams;
  if (key !== token) return <Gate message="גישה נדחתה." />;

  const orders: Order[] = await listOrders();
  const paidCount = orders.filter((o) => o.paymentStatus === "paid").length;
  const revenue = orders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((s, o) => s + (o.paidSum ?? o.totalIls ?? 0), 0);

  // Materials profit — the catalogue sheds plus every design that was ordered,
  // quoted once each (several orders of the same design share one quote).
  const catalogueCodes = SIZES.flatMap((s) => (s.designCode ? [s.designCode] : []));
  const orderCodes = orders.flatMap((o) => (o.designCode ? [o.designCode] : []));
  const profits = await quoteProfits([...catalogueCodes, ...orderCodes]);

  return (
    <main data-id="admin-orders" dir="rtl" style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 18px", fontFamily: "inherit" }}>
      <h1 data-id="admin-title" style={{ fontSize: 24, fontWeight: 800, color: "#2f8fd6", margin: "0 0 6px" }}>
        הזמנות
      </h1>
      <p data-id="admin-summary" style={{ color: "#666", fontSize: 14, margin: "0 0 20px" }}>
        {orders.length} הזמנות · {paidCount} שולמו · הכנסה מאומתת {ils(revenue)}
      </p>

      {/* What the catalogue shed earns on its materials, live from the CAD
          price sheet: sticker price (incl. VAT) vs. our ex-VAT cost. Add-ons
          (הובלה/הרכבה/רצפה) are not costed there, so this is materials only. */}
      <section data-id="admin-profit" style={{ margin: "0 0 24px" }}>
        <h2 data-id="admin-profit-title" style={{ fontSize: 16, fontWeight: 800, color: "#333", margin: "0 0 8px" }}>
          רווח חומרים (לפי מחירון CAD)
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {SIZES.map((s) => {
            const cell = s.designCode ? profits.get(s.designCode) : undefined;
            const q = cell && "quote" in cell ? cell.quote : undefined;
            return (
              <div
                key={s.label}
                data-id="admin-profit-card"
                style={{ border: "1px solid #e8e8e8", borderRadius: 10, padding: "12px 16px", background: "#fff", minWidth: 260 }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>מחסן {s.label}</div>
                {q ? (
                  <div style={{ fontSize: 13.5, color: "#555", display: "grid", gap: 2 }}>
                    <div>מחיר חומרים: <b dir="ltr">{ils(Math.round(q.totalIncVat))}</b> (לפני מע״מ <span dir="ltr">{ils(Math.round(q.totalExVat))}</span>)</div>
                    <div>עלות חומרים (לפני מע״מ): <b dir="ltr">{ils(Math.round(q.totalCost))}</b></div>
                    <div>
                      רווח: <ProfitValue cell={cell} />
                      {q.profit !== null && q.totalExVat > 0 ? (
                        <span style={{ color: "#888", fontSize: 12 }}> ({Math.round((q.profit / q.totalExVat) * 100)}%)</span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <ProfitValue cell={cell} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {orders.length === 0 ? (
        <p data-id="admin-empty" style={{ color: "#888" }}>אין הזמנות עדיין.</p>
      ) : (
        <div data-id="admin-table-wrap" style={{ overflowX: "auto", border: "1px solid #e8e8e8", borderRadius: 10 }}>
          <table data-id="admin-orders-table" style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr>
                <th style={th}>תאריך</th>
                <th style={th}>סטטוס</th>
                <th style={th}>לקוח</th>
                <th style={th}>טלפון</th>
                <th style={th}>מוצר</th>
                <th style={th}>סכום</th>
                <th style={th}>רווח חומרים</th>
                <th style={th}>פרטים</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const s = STATUS[o.paymentStatus] ?? STATUS.pending;
                return (
                  <tr key={o.id} data-id={`admin-order-row`}>
                    <td style={cell} dir="ltr">{fmtDate(o.timestamp)}</td>
                    <td style={cell}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                        <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                        {s.label}
                      </span>
                    </td>
                    <td style={cell}>{o.name}</td>
                    <td style={cell} dir="ltr">
                      <a data-id="admin-order-phone" href={`tel:${o.phone}`} style={{ color: "#2f8fd6", textDecoration: "none" }}>{o.phone}</a>
                      {o.email ? (
                        <div style={{ color: "#888", fontSize: 12 }}>
                          {o.email}
                          {/* Only a positive claim: the badge means the buyer typed
                              back a code we mailed there. No badge is not a claim
                              that the address is fake — orders from before
                              verification existed simply have no proof either way. */}
                          {o.emailVerified ? (
                            <span data-id="admin-order-email-verified" title="הכתובת אומתה בקוד" style={{ color: "#1e9e54", marginInlineStart: 4 }}>
                              ✓
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                    <td style={cell}>{o.title}</td>
                    <td style={{ ...cell, fontWeight: 700 }} dir="ltr">{ils(o.paidSum ?? o.totalIls)}</td>
                    <td style={cell}>
                      {/* Materials only — the order total also carries add-ons
                          (הובלה/הרכבה/רצפה) that have no cost sheet. */}
                      <ProfitValue cell={o.designCode ? profits.get(o.designCode) : undefined} />
                    </td>
                    <td style={{ ...cell, color: "#777", fontSize: 12.5, maxWidth: 280 }}>
                      {o.notes ? <div>📝 {o.notes}</div> : null}
                      {/* The shed that was sold. Opens in the planner with the
                          door, slope and channel the buyer chose. */}
                      {o.designCode ? (
                        <div>
                          <a
                            data-id="admin-order-design"
                            href={designUrl(o.designCode)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#2f8fd6", textDecoration: "none", fontWeight: 700 }}
                          >
                            📐 העיצוב במתכנן
                          </a>
                        </div>
                      ) : null}
                      {o.cardSuffix ? <div dir="ltr">card ****{o.cardSuffix}</div> : null}
                      {o.asmachta ? <div dir="ltr">asmachta {o.asmachta}</div> : null}
                      <div dir="ltr" style={{ color: "#bbb" }}>{o.id}</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
