import "server-only";
import { promises as fs } from "fs";
import path from "path";

/**
 * File-backed order store. An order starts life as a `pending` payment when the
 * customer submits the checkout form, gets linked to a Grow/Meshulam payment
 * process (processId/processToken), and is flipped to `paid` ONLY by the
 * server-to-server webhook after the payment is authenticated. Persisted to
 * data/orders.json (gitignored). Writes are atomic (temp file + rename) and
 * updates re-read before writing so the checkout-create and webhook paths don't
 * clobber each other.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

export type OrderLine = { label: string; choice: string; price: number | null };
export type PaymentStatus = "pending" | "paid" | "failed";

export type Order = {
  id: string;
  timestamp: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  title: string;
  totalIls: number | null;
  options: OrderLine[];
  paymentStatus: PaymentStatus;
  // Grow/Meshulam payment-process linkage (set at create time).
  processId?: string;
  processToken?: string;
  // Transaction facts, filled in by the webhook once authenticated + paid.
  transactionId?: string;
  asmachta?: string;
  cardSuffix?: string;
  cardBrand?: string;
  paidSum?: number;
  paidAt?: string;
  failedAt?: string;
};

async function readOrders(): Promise<Order[]> {
  try {
    const raw = await fs.readFile(ORDERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Order[]) : [];
  } catch {
    return [];
  }
}

async function writeOrders(orders: Order[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${ORDERS_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(orders, null, 2), "utf8");
  await fs.rename(tmp, ORDERS_FILE);
}

export async function appendOrder(order: Order): Promise<void> {
  const orders = await readOrders();
  orders.push(order);
  await writeOrders(orders);
}

export async function findOrder(id: string): Promise<Order | null> {
  const orders = await readOrders();
  return orders.find((o) => o.id === id) ?? null;
}

/** Re-read, patch the matching order in place, and write back atomically. */
export async function updateOrder(
  id: string,
  patch: Partial<Order>,
): Promise<Order | null> {
  const orders = await readOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...patch };
  await writeOrders(orders);
  return orders[idx];
}
