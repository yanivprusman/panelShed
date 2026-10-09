import { NextResponse } from "next/server";
import {
  OWNER_COOKIE,
  OWNER_COOKIE_MAX_AGE,
  isOwner,
  ownerConfigured,
  ownerSessionFor,
  sameOrigin,
} from "@/lib/owner-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Is this browser the owner's? Read by the buy card to show the quote tools. */
export async function GET() {
  return NextResponse.json({ owner: await isOwner() });
}

/** Sign in with the owner password. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "bad_origin" }, { status: 403 });
  }
  if (!ownerConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  let password = "";
  try {
    password = String(((await request.json()) as { password?: unknown }).password ?? "");
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const session = ownerSessionFor(password);
  if (!session) {
    // A second per wrong guess: harmless to the owner, ruinous to a guessing loop.
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ ok: false, error: "wrong_password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(OWNER_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    secure: (request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "")) === "https",
    path: "/",
    maxAge: OWNER_COOKIE_MAX_AGE,
  });
  return res;
}

/** Sign this browser out. */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "bad_origin" }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(OWNER_COOKIE);
  return res;
}
