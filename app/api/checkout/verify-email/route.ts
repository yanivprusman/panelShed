import { NextResponse } from "next/server";
import {
  isPlausibleEmail,
  domainAcceptsMail,
  issueCode,
  codeEmail,
  normalizeEmail,
} from "@/lib/emailVerification";
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";

/**
 * Mail a verification code to a buyer-supplied address.
 *
 * The email field on the buy form is optional; this exists so that an address
 * the buyer DOES give is proved real before it is attached to their order. The
 * response never contains the code.
 *
 * Failures are explicit, never papered over: an unreachable relay returns 502
 * and the form tells the buyer they can continue without an email. Silently
 * accepting an unproven address would defeat the entire point.
 */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const email = normalizeEmail(body.email ?? "");
  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ ok: false, error: "bad_email" }, { status: 400 });
  }
  if (!(await domainAcceptsMail(email))) {
    return NextResponse.json({ ok: false, error: "no_such_domain" }, { status: 400 });
  }

  const issued = issueCode(email);
  if (!issued.ok) {
    return NextResponse.json({ ok: false, error: issued.error }, { status: 429 });
  }

  const { subject, body: text } = codeEmail(issued.code);
  try {
    await sendMail(email, subject, text);
  } catch (e) {
    console.error("[verify-email] send failed", e);
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
  }

  console.log(`[verify-email] code issued for ${email}`);
  return NextResponse.json({ ok: true, token: issued.token });
}
