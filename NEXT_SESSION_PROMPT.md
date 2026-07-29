panelShed (/opt/dev/panelShed) — help me get Grow/Meshulam payments LIVE, end to end.
Be my hands-on guide through the WHOLE flow, including opening the Grow account.

GOAL: panelShed charges real money via Grow (Meshulam). The integration code is already
done and proven in sandbox; what remains is the merchant account + real credentials, and
I want help through ALL of it — don't just wait for me to hand you the IDs.

WHAT I WANT YOU TO DO — guide me step by step:

1) OPEN / COMPLETE THE GROW ACCOUNT.
   - Signup: https://grow.business/join-us/   Merchant login: https://grow.website/
   - Drive my Chrome with the claude-in-chrome tools: tabs_context first, then navigate,
     read the live page, screenshot, and tell me EXACTLY what to type in each field and
     which option to pick. For direct API integration, choose the "אינטגרציית API" card.
   - The signup's first screen captures שם פרטי / שם משפחה / מספר טלפון (no email field) —
     that's the contact-capture step.
   - BOUNDARY (important, so you don't get stuck): you cannot type my personal/business
     details or click the final submit on an account signup — that's account creation,
     which I do myself. So for EACH step: read the screen, tell me precisely what to enter
     / which button to click, I type + submit, then you re-read the screen and continue.
     Do NOT refuse the whole task, and do NOT loop on one screen — guide me field by field.

2) GET THE API CREDENTIALS.
   - If the dashboard doesn't expose them, draft a short Hebrew message to Grow support
     (WhatsApp/SMS 052-777-3144, email support@grow.business) requesting direct API
     (Light Server) integration + a Sandbox + my userId and pageCode. I'll send it.

3) WIRE IT IN + VERIFY.
   - When I give you my real userId + pageCode: put them in /opt/dev/panelShed/.env.local,
     set MESHULAM_ENV=live, restart with `d restartApp --app panelShed`, then VERIFY the
     real payment form renders — POST a checkout via https://panelshed.dev.ya-niv.com and
     open the returned Grow URL in an isolated browser; confirm it shows a real Bit/card
     form, not "Some error occupied (4)".

TECHNICAL STATE (don't re-derive):
- Integration is code-complete, committed, pushed. Flow: buy button → /api/checkout opens
  a Grow payment process → redirect to hosted page → server-to-server webhook
  /api/checkout/callback is the SOLE authority that marks an order paid (auth via the
  stored processToken + amount guard). Mechanics are in /opt/dev/panelShed/AGENTS.md.
- .env.local (gitignored) currently holds Grow's PUBLIC SANDBOX DEMO ids
  (MESHULAM_USER_ID=be4b3fe033f400be, MESHULAM_PAGE_CODE=f6a3c7d0ed02, MESHULAM_ENV=sandbox).
  With these the API works but Grow's hosted page shows "Some error occupied (4)" because
  the demo account is unprovisioned — EXPECTED, not a panelShed bug.
- Already fixed (commit 91257c0): the pay button did nothing when opened via
  panelshed.dev.ya-niv.com because Next 16 blocked cross-origin /_next/* (host not in
  allowedDevOrigins) → page never hydrated → no onClick fired. Fixed by adding
  '*.dev.ya-niv.com' to next.config.ts.
- I started the Grow signup on 2026-06-21 and chose "אינטגרציית API"; Grow said they'd
  contact me. We may be redoing or continuing the signup.

START BY: checking my open Chrome tabs (tabs_context), screenshotting where the Grow
signup currently is, and guiding me from there.
