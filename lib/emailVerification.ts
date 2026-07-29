import "server-only";
import { randomBytes, randomInt, timingSafeEqual } from "crypto";
import { promises as dns } from "dns";

/**
 * Proof that a buyer's email address actually exists.
 *
 * The buy form asks for an email but does NOT require one (Grow is the only
 * reason it was ever mandatory, and demanding identity before showing a price
 * is what made a real ad-clicking visitor type "2435234k@gmail.com" on
 * 2026-07-19 and leave). The rule is now: an email is optional, but an address
 * that has not proved it can receive mail is never stored as the customer's.
 *
 * Format checks can't do this — the fake above is syntactically perfect and
 * gmail.com resolves. Only a code sent to the address and typed back proves it.
 *
 * State is per-process and in memory: a restart drops pending codes, which
 * costs a buyer one "send me a code" tap and can never mark an address
 * verified that isn't.
 */

const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
/** Codes issued per address per window, so this can't be used as a mail cannon. */
const MAX_SENDS = 3;
const SEND_WINDOW_MS = 10 * 60 * 1000;

type Pending = {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
};

const pending = new Map<string, Pending>();
const sendLog = new Map<string, number[]>();

function sweep(now: number): void {
  for (const [token, p] of pending) if (p.expiresAt <= now) pending.delete(token);
  for (const [email, times] of sendLog) {
    const live = times.filter((t) => now - t < SEND_WINDOW_MS);
    if (live.length) sendLog.set(email, live);
    else sendLog.delete(email);
  }
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Syntax gate. Deliberately conservative — it only rejects what cannot be an
 * address; deciding whether the mailbox is real is the code's job, not a
 * regex's.
 */
export function isPlausibleEmail(raw: string): boolean {
  const email = normalizeEmail(raw);
  if (email.length < 6 || email.length > 254) return false;
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return false;
  const [local, domain] = email.split("@");
  return local.length <= 64 && domain.length <= 253;
}

/**
 * Does the domain accept mail at all? Rejects invented domains before we try to
 * send, so the buyer gets "there is no such mail domain" instead of a silent
 * nothing. A domain with no MX but an A record still accepts mail per RFC 5321,
 * so that counts too.
 */
export async function domainAcceptsMail(email: string): Promise<boolean> {
  const domain = normalizeEmail(email).split("@")[1];
  if (!domain) return false;
  try {
    const mx = await dns.resolveMx(domain);
    if (mx.length > 0) return true;
  } catch {
    // fall through to the A-record check below
  }
  try {
    const a = await dns.resolve4(domain);
    return a.length > 0;
  } catch {
    return false;
  }
}

export type IssueResult =
  | { ok: true; token: string; code: string }
  | { ok: false; error: "too_many_sends" };

/** Mint a code for an address. The caller is responsible for mailing it. */
export function issueCode(rawEmail: string): IssueResult {
  const now = Date.now();
  sweep(now);
  const email = normalizeEmail(rawEmail);

  const sends = (sendLog.get(email) ?? []).filter((t) => now - t < SEND_WINDOW_MS);
  if (sends.length >= MAX_SENDS) return { ok: false, error: "too_many_sends" };
  sendLog.set(email, [...sends, now]);

  const token = randomBytes(18).toString("base64url");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  pending.set(token, { email, code, expiresAt: now + CODE_TTL_MS, attempts: 0 });
  return { ok: true, token, code };
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; error: "expired" | "mismatch" | "too_many_attempts" };

/**
 * Check a code. Single-use: a correct answer consumes the token, so the same
 * proof can't be replayed onto a different order.
 */
export function verifyCode(token: string, rawCode: string, rawEmail: string): VerifyResult {
  const now = Date.now();
  sweep(now);
  const entry = pending.get(token);
  if (!entry || entry.expiresAt <= now) return { ok: false, error: "expired" };
  if (entry.email !== normalizeEmail(rawEmail)) return { ok: false, error: "mismatch" };
  if (entry.attempts >= MAX_ATTEMPTS) {
    pending.delete(token);
    return { ok: false, error: "too_many_attempts" };
  }
  entry.attempts += 1;

  const got = Buffer.from((rawCode ?? "").trim());
  const want = Buffer.from(entry.code);
  const match = got.length === want.length && timingSafeEqual(got, want);
  if (!match) return { ok: false, error: "mismatch" };

  pending.delete(token);
  return { ok: true };
}

/** The message the buyer receives. */
export function codeEmail(code: string): { subject: string; body: string } {
  return {
    subject: `${code} — קוד האימות שלך באתר פאנל-שד`,
    body: [
      `קוד האימות שלך הוא:`,
      ``,
      `    ${code}`,
      ``,
      `הקוד תקף ל-15 דקות. הזינו אותו בטופס ההזמנה כדי שנוכל לשלוח לכם את הקבלה.`,
      ``,
      `אם לא ביקשתם את הקוד — אפשר להתעלם מההודעה.`,
      ``,
      `פאנל-שד · ג.ח. פרוייקטים`,
    ].join("\n"),
  };
}
