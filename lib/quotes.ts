import "server-only";
import { promises as fs } from "fs";
import path from "path";
import type { OrderLine } from "@/lib/orders";
import type { PricedLine } from "@/app/_components/options";

/**
 * Price quotes the owner issued, file-backed like orders (data/quotes.json,
 * gitignored).
 *
 * A quote is a record, not a view: its lines and total are FROZEN at issue
 * time. The CAD materials price revalidates hourly, so re-pricing a quote when
 * someone asks about it a week later would hand back a different number than
 * the PDF the customer is holding — the one thing a quote must never do.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const QUOTES_FILE = path.join(DATA_DIR, "quotes.json");

/** How long a quote holds its price. Printed on the PDF. */
export const QUOTE_VALID_DAYS = 14;

export type QuoteCustomer = {
  name: string;
  phone: string;
  email: string;
  address: string;
};

export type Quote = {
  id: string;
  /** Human number, sequential per year: 2026-001. */
  number: string;
  createdAt: string;
  validUntil: string;
  customer: QuoteCustomer;
  notes: string;
  title: string;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  custom: boolean;
  nonStandardSize: boolean;
  designCode?: string;
  basePrice: number;
  lines: OrderLine[];
  choiceLines: PricedLine[];
  totalIls: number;
};

async function readQuotes(): Promise<Quote[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(QUOTES_FILE, "utf8"));
    return Array.isArray(parsed) ? (parsed as Quote[]) : [];
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    // A corrupt file must not be read as "no quotes": the next number would
    // restart at 001 and repeat a number a customer already holds.
    throw e;
  }
}

async function writeQuotes(quotes: Quote[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${QUOTES_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(quotes, null, 2), "utf8");
  await fs.rename(tmp, QUOTES_FILE);
}

/** Number the quote, stamp its dates, and persist it. */
export async function issueQuote(
  q: Omit<Quote, "id" | "number" | "createdAt" | "validUntil">,
): Promise<Quote> {
  const quotes = await readQuotes();
  const now = new Date();
  const year = now.getFullYear();
  const seq = quotes.filter((x) => x.number.startsWith(`${year}-`)).length + 1;
  const quote: Quote = {
    ...q,
    id: `quote_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
    number: `${year}-${String(seq).padStart(3, "0")}`,
    createdAt: now.toISOString(),
    validUntil: new Date(now.getTime() + QUOTE_VALID_DAYS * 86_400_000).toISOString(),
  };
  quotes.push(quote);
  await writeQuotes(quotes);
  return quote;
}
