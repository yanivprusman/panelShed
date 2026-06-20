import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

type OrderLine = { label: string; choice: string; price: number | null };
type OrderPayload = {
  name?: string;
  phone?: string;
  notes?: string;
  title?: string;
  totalIls?: number;
  options?: OrderLine[];
};

async function readOrders(): Promise<unknown[]> {
  try {
    const raw = await fs.readFile(ORDERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Records an order-request (lead). This is NOT a payment — it stores the
 * configured shed + the customer's contact details so the owner can call back
 * to confirm and arrange delivery/payment. Persisted to data/orders.json
 * (gitignored).
 */
export async function POST(request: Request) {
  let body: OrderPayload;
  try {
    body = (await request.json()) as OrderPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const phone = (body.phone ?? "").trim();
  if (!name || !phone) {
    return NextResponse.json(
      { ok: false, error: "missing_required" },
      { status: 400 },
    );
  }

  const order = {
    id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    status: "new",
    name,
    phone,
    notes: (body.notes ?? "").trim(),
    title: body.title ?? "",
    totalIls: typeof body.totalIls === "number" ? body.totalIls : null,
    options: Array.isArray(body.options) ? body.options : [],
  };

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const orders = await readOrders();
    orders.push(order);
    await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
  } catch (e) {
    console.error("orders save failed", e);
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, orderId: order.id });
}
