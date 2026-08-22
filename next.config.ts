import type { NextConfig } from "next";
import path from "node:path";
import fs from "node:fs";

// feedback-lib + launcher live as workspace packages at /opt/automateLinux/.
// Turbopack's `root` must contain the project AND the workspace symlink
// targets, so we pick /opt/ as the common ancestor. Fail loud if the
// workspace is missing — no silent fallback.
const turbopackRoot = path.resolve(process.cwd(), "../../");
const workspaceRoot = path.resolve(turbopackRoot, "automateLinux");
if (!fs.existsSync(path.join(workspaceRoot, "packages/feedback-lib/package.json"))) {
  throw new Error(
    `feedback-lib workspace guard: expected workspace at ${workspaceRoot} ` +
      `(derived from Turbopack root ${turbopackRoot}). ` +
      `Update the relative path or check the checkout layout.`,
  );
}

const nextConfig: NextConfig = {
  // The app is reached in dev via the public subdomain (panelshed.dev.ya-niv.com).
  // Next 16 blocks cross-origin /_next/* dev resources unless the host is allowed,
  // which silently breaks client hydration (buttons stop firing). Allow the dev
  // wildcard by default; ALLOWED_DEV_ORIGINS can add more.
  allowedDevOrigins: [
    '*.dev.ya-niv.com',
    ...(process.env.ALLOWED_DEV_ORIGINS?.split(',').filter(Boolean) ?? []),
  ],
  turbopack: { root: turbopackRoot },
  transpilePackages: ['@claudecontrol/feedback-lib', '@addnewfeature/feedback-lib-launcher'],
  // The storefront is the "panelshed" niche of the גובה דרום venture. Its
  // analytics beacon (public/gova-track.js) posts same-origin to /api/gova/*,
  // proxied here to the govaBoard collector on the NUC over WireGuard — same
  // pattern as the apex nginx proxy the landers use, so the browser never
  // makes a cross-origin request.
  async rewrites() {
    return [{ source: '/api/gova/:path*', destination: 'http://10.7.0.1:3125/api/:path*' }];
  },
};

export default nextConfig;
