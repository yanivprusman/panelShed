import { listOrders, type Order, type PaymentStatus } from "@/lib/orders";

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

  return (
    <main data-id="admin-orders" dir="rtl" style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 18px", fontFamily: "inherit" }}>
      <h1 data-id="admin-title" style={{ fontSize: 24, fontWeight: 800, color: "#2f8fd6", margin: "0 0 6px" }}>
        הזמנות
      </h1>
      <p data-id="admin-summary" style={{ color: "#666", fontSize: 14, margin: "0 0 20px" }}>
        {orders.length} הזמנות · {paidCount} שולמו · הכנסה מאומתת {ils(revenue)}
      </p>

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
                      {o.email ? <div style={{ color: "#888", fontSize: 12 }}>{o.email}</div> : null}
                    </td>
                    <td style={cell}>{o.title}</td>
                    <td style={{ ...cell, fontWeight: 700 }} dir="ltr">{ils(o.paidSum ?? o.totalIls)}</td>
                    <td style={{ ...cell, color: "#777", fontSize: 12.5, maxWidth: 280 }}>
                      {o.notes ? <div>📝 {o.notes}</div> : null}
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
