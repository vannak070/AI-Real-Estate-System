import type { Config } from './config.js';

// localhost + RFC1918 private ranges (what a LAN address actually looks like).
const PRIVATE_HOST =
  /^(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/;
const DEV_PORTS = new Set(['5173', '5174']);

/**
 * `config.corsOrigins` is a fixed allowlist (right for production). In dev we
 * additionally accept any private-network origin on the known frontend ports
 * — the whole point of running on the LAN is that the IP is whatever DHCP
 * handed out, so a static list would need editing every time it changes.
 */
export function createCorsOriginChecker(config: Config) {
  return (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
    if (!origin) return cb(null, true); // non-browser callers (curl, server-to-server) — CORS doesn't apply
    if (config.corsOrigins.includes(origin)) return cb(null, true);

    if (config.nodeEnv !== 'production') {
      try {
        const url = new URL(origin);
        if (PRIVATE_HOST.test(url.hostname) && DEV_PORTS.has(url.port)) return cb(null, true);
      } catch {
        // fall through to reject
      }
    }
    cb(null, false);
  };
}
