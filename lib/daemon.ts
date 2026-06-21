import "server-only";
import net from "net";

/**
 * Minimal client for the local automateLinux daemon's Unix socket. Same wire
 * protocol the dashboard uses: connect, write one JSON command + "\n", read
 * until the reply ends with "\n". Every peer runs a local daemon, so this works
 * wherever the app is hosted; the daemon forwards peer-targeted work itself.
 */
const UDS_PATH = "/run/automatelinux/automatelinux-daemon.sock";

export function sendDaemonCommand(
  command: Record<string, unknown>,
  timeoutMs = 8000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let response = "";
    let done = false;
    const client = net.createConnection(UDS_PATH);

    const finish = (fn: (v: unknown) => void, v: unknown) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      client.destroy();
      fn(v);
    };
    const timer = setTimeout(() => finish(reject as (v: unknown) => void, new Error("daemon timeout")), timeoutMs);

    client.on("connect", () => client.write(JSON.stringify(command) + "\n"));
    client.on("data", (d) => {
      response += d.toString();
      if (response.endsWith("\n")) finish(resolve as (v: unknown) => void, response);
    });
    client.on("error", (e) => finish(reject as (v: unknown) => void, e));
    client.on("close", () => finish(resolve as (v: unknown) => void, response));
  });
}
