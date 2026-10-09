import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * The shop owner, signed in on this browser.
 *
 * One secret, the same `ADMIN_TOKEN` that guards /admin/orders: the owner types
 * it once per device at /owner, and the browser keeps a cookie that is an HMAC
 * of it — never the token itself. Rotating the token therefore signs every
 * device out, and a stolen cookie is useless once it is rotated.
 *
 * Unset `ADMIN_TOKEN` means nobody is the owner. That is an error the sign-in
 * page shows, not an open door.
 */

export const OWNER_COOKIE = "ps_owner";
export const OWNER_COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // half a year per device

function adminToken(): string | null {
  const t = process.env.ADMIN_TOKEN?.trim();
  return t ? t : null;
}

function sessionValue(token: string): string {
  return createHmac("sha256", token).update("panelshed-owner-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function ownerConfigured(): boolean {
  return adminToken() !== null;
}

/** The cookie value to set when `password` is right; null when it is not. */
export function ownerSessionFor(password: string): string | null {
  const token = adminToken();
  if (!token || !safeEqual(password, token)) return null;
  return sessionValue(token);
}

export async function isOwner(): Promise<boolean> {
  const token = adminToken();
  if (!token) return false;
  const value = (await cookies()).get(OWNER_COOKIE)?.value;
  return !!value && safeEqual(value, sessionValue(token));
}

/**
 * A cookie-authenticated write must also come from this site's own pages.
 * SameSite=Lax already keeps the cookie off cross-site POSTs; this is the second
 * lock, so a browser quirk or a future SameSite change cannot turn the owner's
 * signed-in phone into something another site can drive.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
