import "server-only";
import { sendDaemonCommand } from "@/lib/daemon";
import { EMAIL } from "@/app/_components/contact";
import type { Order } from "@/lib/orders";

const ils = (n: number | null | undefined) =>
  typeof n === "number" ? `${n.toLocaleString("he-IL")} ש"ח` : "—";

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

/**
 * Notify the owner of a paid order by email, via the daemon → NUC msmtp (Brevo).
 * Best-effort: any failure is logged and swallowed — a notification problem must
 * never undo or fail the payment confirmation.
 */
export async function notifyOwnerPaid(order: Order): Promise<void> {
  try {
    const to = EMAIL;
    const subject = `הזמנה חדשה ${ils(order.paidSum ?? order.totalIls)} — ${order.title}`;
    const mime = buildMime(to, subject, orderEmailBody(order));
    const transport = Buffer.from(mime, "utf8").toString("base64");
    const shellCmd = `printf %s '${transport}' | base64 -d | msmtp -t`;
    await sendDaemonCommand({
      command: "execOnPeer",
      peer: "leader",
      directory: "/root",
      shellCmd,
    });
    console.log(`[notify] owner emailed for paid order ${order.id}`);
  } catch (e) {
    console.error(`[notify] failed to email owner for order ${order.id}`, e);
  }
}
