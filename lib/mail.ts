import "server-only";
import { sendDaemonCommand } from "@/lib/daemon";

/**
 * Outbound mail for the storefront. Everything goes out through the daemon →
 * leader (NUC) → msmtp → Brevo, so this process never speaks SMTP itself.
 *
 * Subject + body are base64-encoded inside the MIME message (so Hebrew is
 * safe), and the whole message is base64-transported in the shell command —
 * customer-controlled text therefore never touches a shell, so there is no
 * command-injection surface.
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

/**
 * Hand a message to msmtp on the leader. Resolves once msmtp has accepted it.
 *
 * IMPORTANT: this proves the relay took the message, NOT that it reached the
 * inbox. Brevo answers "250 OK: queued" for addresses on its suppression list
 * and then discards them — that silently ate five days of owner alerts in July
 * 2026. Never report "delivered" on the strength of this resolving.
 */
export async function sendMail(
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  const transport = Buffer.from(buildMime(to, subject, body), "utf8").toString("base64");
  await sendDaemonCommand({
    command: "execOnPeer",
    peer: "leader",
    directory: "/root",
    shellCmd: `printf %s '${transport}' | base64 -d | msmtp -t`,
  });
}
