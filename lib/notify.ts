import "server-only";
import { sendDaemonCommand } from "@/lib/daemon";
import { ALERT_EMAIL } from "@/app/_components/contact";
import { designUrl } from "@/app/_components/planner";
import type { Order } from "@/lib/orders";

const ils = (n: number | null | undefined) =>
  typeof n === "number" ? `${n.toLocaleString("he-IL")} ש"ח` : "—";

/**
 * Order alerts go to the dedicated "panel shed" WhatsApp ops group (owner +
 * bot are members; the bot account is the sender, so the owner's phone
 * actually rings — self-sent messages don't).
 */
const OWNER_WHATSAPP = "120363428530759851@g.us";

/**
 * Every order the customer submits raises an alert — not just the ones that
 * end in a payment. A person who typed their name, phone and a question into
 * the form is a lead whether or not the card leg succeeded, and the two
 * non-paid outcomes are the ones that need a human fastest:
 *
 *   submitted — form accepted, customer sent on to Grow's payment page.
 *   failed    — the payment leg errored; the customer saw an error message and
 *               is sitting there with money in hand and no way to give it.
 *   paid      — confirmed by Grow's server-to-server webhook.
 *
 * (2026-07-12: a real customer submitted a full order with a question about
 * delivery to his address, createPaymentLink threw, and nothing alerted anyone.
 * The row sat unread in orders.json for 17 days. That is what this fixes.)
 */
export type OrderEvent = "submitted" | "failed" | "paid";

type EventCopy = {
  subject: (o: Order) => string;
  heading: string;
  /** What the owner should DO — the whole point of the alert. */
  action: string;
};

const EVENTS: Record<OrderEvent, EventCopy> = {
  submitted: {
    subject: (o) => `ליד חדש: ${o.name} · ${ils(o.totalIls)} · ${o.title}`,
    heading: "📥 לקוח מילא טופס הזמנה והועבר לדף התשלום",
    action: "אם לא תגיע הודעת תשלום בדקות הקרובות — התקשרו אליו.",
  },
  failed: {
    subject: (o) => `⚠️ הסליקה נכשלה: ${o.name} · ${ils(o.totalIls)}`,
    heading: "⚠️ הלקוח ניסה לשלם וקיבל שגיאה — הסליקה נכשלה",
    action: "הוא רצה לקנות ולא הצליח. התקשרו אליו עכשיו.",
  },
  paid: {
    subject: (o) => `הזמנה חדשה ${ils(o.paidSum ?? o.totalIls)} — ${o.title}`,
    heading: "🎉 התקבל תשלום חדש באתר פאנל-שד",
    action: "",
  },
};

/** Tap-to-chat link, so the alert itself is the first step of the callback. */
function waLink(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("0") ? `972${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
}

/**
 * One body for both channels: everything a human needs to pick up the phone
 * without opening a laptop. Payment facts appear only once they exist.
 */
function orderBody(order: Order, event: OrderEvent): string {
  const copy = EVENTS[event];
  const lines = order.options
    .filter((o) => o.price != null)
    .map((o) => `  • ${o.choice} — ${ils(o.price ?? 0)}`)
    .join("\n");
  return [
    copy.heading,
    ``,
    `לקוח: ${order.name}`,
    `טלפון: ${order.phone}`,
    `וואטסאפ: ${waLink(order.phone)}`,
    order.email ? `אימייל: ${order.email}` : ``,
    order.notes ? `הערות הלקוח: ${order.notes}` : ``,
    ``,
    `מוצר: ${order.title}`,
    // The shed itself, for anyone who has to build it: door side, swing, roof
    // slope and channel material live behind this link, and the price above was
    // computed from them.
    order.designCode ? `העיצוב: ${designUrl(order.designCode)}` : ``,
    `סכום: ${ils(order.paidSum ?? order.totalIls)}`,
    lines ? `פירוט:\n${lines}` : ``,
    order.cardSuffix ? `כרטיס: ****${order.cardSuffix}` : ``,
    order.asmachta ? `אסמכתא: ${order.asmachta}` : ``,
    order.transactionId ? `מזהה עסקה: ${order.transactionId}` : ``,
    `מספר הזמנה: ${order.id}`,
    copy.action ? `\n${copy.action}` : ``,
  ]
    .filter((l) => l !== ``)
    .join("\n");
}

/**
 * Build a full UTF-8 MIME message. Subject + body are base64-encoded inside the
 * message (so Hebrew is safe), and the whole message is base64-transported in
 * the shell command below — customer-controlled fields (name/notes) therefore
 * never touch a shell, so there's no command-injection surface.
 */
function buildMime(to: string, subject: string, body: string): string {
  const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
  const headers = [
    `To: ${to}`,
    `From: noreply@ya-niv.com`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
  ].join("\r\n");
  const bodyB64 = b64(body).replace(/(.{76})/g, "$1\r\n");
  return `${headers}\r\n\r\n${bodyB64}\r\n`;
}

/** Email the owner via the daemon → NUC msmtp (Brevo). */
async function emailOwner(order: Order, event: OrderEvent): Promise<void> {
  const mime = buildMime(ALERT_EMAIL, EVENTS[event].subject(order), orderBody(order, event));
  const transport = Buffer.from(mime, "utf8").toString("base64");
  const shellCmd = `printf %s '${transport}' | base64 -d | msmtp -t`;
  await sendDaemonCommand({
    command: "execOnPeer",
    peer: "leader",
    directory: "/root",
    shellCmd,
  });
  console.log(`[notify] owner emailed (${event}) for order ${order.id}`);
}

/**
 * WhatsApp the owner via the NUC bot bridge (whatsapp-bridge-bot on
 * 127.0.0.1:8081, POST /api/send). Runs ON the leader via execOnPeer, mirroring
 * the email path. The {recipient,message} JSON is base64-transported and decoded
 * on the NUC, so customer-controlled text (name/notes) never touches a shell.
 *
 * The bridge requires "Authorization: Bearer <token>" on every /api/* request
 * (401 otherwise — this silently ate the first real order notification on
 * 2026-07-08). The token lives ONLY on the NUC (store/.bridge-token, 0600) and
 * is read there at exec time, so the secret never enters this repo or crosses
 * the wire. We also verify the bridge's JSON answer — a delivered HTTP response
 * is not a delivered message.
 */
const BOT_BRIDGE_TOKEN_FILE =
  "/opt/automateLinux/mcpServers/whatsapp/whatsapp-bridge-bot/store/.bridge-token";

async function whatsappOwner(order: Order, event: OrderEvent): Promise<void> {
  const payload = JSON.stringify({
    recipient: OWNER_WHATSAPP,
    message: orderBody(order, event),
  });
  const b64 = Buffer.from(payload, "utf8").toString("base64");
  const shellCmd = `printf %s '${b64}' | base64 -d | curl -sS -f -X POST http://127.0.0.1:8081/api/send -H "Authorization: Bearer $(cat ${BOT_BRIDGE_TOKEN_FILE})" -H 'Content-Type: application/json' --data-binary @-`;
  const reply = await sendDaemonCommand({
    command: "execOnPeer",
    peer: "leader",
    directory: "/root",
    shellCmd,
  });
  if (!reply.includes('"success":true')) {
    throw new Error(`bot bridge did not confirm delivery: ${reply.slice(0, 300)}`);
  }
  console.log(`[notify] owner WhatsApp'd (${event}) for order ${order.id}`);
}

/**
 * Notify the owner by email AND WhatsApp. The two are independent on purpose,
 * not a fallback chain: they fail for unrelated reasons (the bot bridge's
 * WhatsApp session logged itself out on 2026-07-24 and stayed dead for days
 * while email kept working), so each is attempted and each reports its own
 * outcome. A notification failure never fails the caller — the checkout and the
 * payment webhook must complete regardless, and panelShedMonitor.sh re-reads
 * orders.json every 3h as the backstop for anything lost here.
 */
export async function notifyOwner(order: Order, event: OrderEvent): Promise<void> {
  const [email, whatsapp] = await Promise.allSettled([
    emailOwner(order, event),
    whatsappOwner(order, event),
  ]);
  if (email.status === "rejected")
    console.error(`[notify] email failed (${event}) for order ${order.id}`, email.reason);
  if (whatsapp.status === "rejected")
    console.error(`[notify] whatsapp failed (${event}) for order ${order.id}`, whatsapp.reason);
}
