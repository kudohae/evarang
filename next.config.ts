import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  logging: {
    // next dev writes forwarded browser logs under .next/dev/logs; Turbopack then sees a change and reloads the
    // page, which logs again — an endless reload loop when every load logs (e.g. a blocked font in e2e).
    // NEXT_BROWSER_LOGS=off turns forwarding off; otherwise the default (warnings and errors) stays.
    browserToTerminal: process.env.NEXT_BROWSER_LOGS === "off" ? false : "warn",
  },
};

export default nextConfig;
