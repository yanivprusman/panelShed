import "server-only";
import { sendDaemonCommand } from "@/lib/daemon";
import { EMAIL, PHONE_DISPLAY } from "@/app/_components/contact";
import type { Order } from "@/lib/orders";

const ils = (n: number | null | undefined) =>
  typeof n === "number" ? `${n.toLocaleString("he-IL")} ש"ח` : "—";

/** Owner WhatsApp recipient in bridge format (E.164 digits, no +): 055… → 972…. */
const OWNER_WHATSAPP = "972" + PHONE_DISPLAY.replace(/\D/g, "").replace(/^0/, "");

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

function orderEmailBody(order: Order): string {
  const lines = order.options
    .filter((o) => o.price != null)
    .map((o) => `  • ${o.choice} — ${ils(o.price ?? 0)}`)
    .join("\n");
  return [
    `התקבל תשלום חדש באתר פאנל-שד 🎉`,
    ``,
    `מוצר: ${order.title}`,
    `סכום ששולם: ${ils(order.paidSum ?? order.totalIls)}`,
    lines ? `\nפירוט:\n${lines}` : ``,
    ``,
    `לקוח: ${order.name}`,
    `טלפון: ${order.phone}`,
    order.email ? `אימייל: ${order.email}` : ``,
    order.notes ? `הערות: ${order.notes}` : ``,
    ``,
    order.cardSuffix ? `כרטיס: ****${order.cardSuffix}` : ``,
    order.asmachta ? `אסמכתא: ${order.asmachta}` : ``,
    `מספר הזמנה: ${order.id}`,
    order.transactionId ? `מזהה עסקה: ${order.transactionId}` : ``,
  ]
    .filter((l) => l !== ``)
    .join("\n");
}

function orderWhatsAppBody(order: Order): string {
  return [
    `🎉 התקבל תשלום חדש באתר פאנל-שד`,
    `מוצר: ${order.title}`,
    `סכום: ${ils(order.paidSum ?? order.totalIls)}`,
    `לקוח: ${order.name}`,
    `טלפון: ${order.phone}`,
    order.email ? `אימייל: ${order.email}` : ``,
    order.notes ? `הערות: ${order.notes}` : ``,
    `מספר הזמנה: ${order.id}`,
  ]
    .filter((l) => l !== ``)
    .join("\n");
}

/** Email the owner via the daemon → NUC msmtp (Brevo). */
async function emailOwnerPaid(order: Order): Promise<void> {
  const subject = `הזמנה חדשה ${ils(order.paidSum ?? order.totalIls)} — ${order.title}`;
  const mime = buildMime(EMAIL, subject, orderEmailBody(order));
  const transport = Buffer.from(mime, "utf8").toString("base64");
  const shellCmd = `printf %s '${transport}' | base64 -d | msmtp -t`;
  await sendDaemonCommand({
    command: "execOnPeer",
    peer: "leader",
    directory: "/root",
    shellCmd,
  });
  console.log(`[notify] owner emailed for paid order ${order.id}`);
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

async function whatsappOwnerPaid(order: Order): Promise<void> {
  const payload = JSON.stringify({
    recipient: OWNER_WHATSAPP,
    message: orderWhatsAppBody(order),
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
  console.log(`[notify] owner WhatsApp'd for paid order ${order.id}`);
}

/**
 * Notify the owner of a paid order by email AND WhatsApp. Both are best-effort
 * and independent — a notification failure must never undo or fail the payment
 * confirmation (Grow will re-send the callback anyway).
 */
export async function notifyOwnerPaid(order: Order): Promise<void> {
  const [email, whatsapp] = await Promise.allSettled([
    emailOwnerPaid(order),
    whatsappOwnerPaid(order),
  ]);
  if (email.status === "rejected")
    console.error(`[notify] email failed for order ${order.id}`, email.reason);
  if (whatsapp.status === "rejected")
    console.error(`[notify] whatsapp failed for order ${order.id}`, whatsapp.reason);
}
