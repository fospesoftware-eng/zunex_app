import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Security helpers — rate limiting, demo/admin endpoint gating, input
// validation. All endpoints that can mutate state or leak data must use these.
// ---------------------------------------------------------------------------

/**
 * Demo endpoints let the demo panel force payment outcomes, fast-forward
 * charging and abort sessions. This deployment is a DEMO build — the payment
 * provider and hardware are both mocks (no real money, no real device), so
 * the demo is reachable in production when the client is in demo mode (it
 * sends the `x-zunex-demo` header; normal users never do) and requests stay
 * rate-limited.
 *
 * Hardening options (all optional):
 *  - set ZUNEX_DEMO_TOKEN  → demo requires the matching `x-zunex-demo-token`
 *  - set ZUNEX_DEMO_ENABLED=0 → demo disabled entirely in production
 */
function productionDemoAllowed(req: NextRequest): boolean {
  if (process.env.ZUNEX_DEMO_ENABLED === "0") return false;
  const token = process.env.ZUNEX_DEMO_TOKEN;
  if (!token) return true; // demo build, no operator lock configured → allow
  const provided = req.headers.get("x-zunex-demo-token");
  if (!provided || provided.length !== token.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) mismatch |= provided.charCodeAt(i) ^ token.charCodeAt(i);
  return mismatch === 0;
}

export function isDemoAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return productionDemoAllowed(req);
}

/** Shared token check for the scenario header path. */
export function demoAllowed(req: NextRequest): boolean {
  return isDemoAuthorized(req);
}

/**
 * Telemetry endpoints expose per-port device data (battery %, model, OS…).
 * They are for the admin backend, not the customer app. Gate them behind the
 * same shared secret in production; open in development.
 */
export function isAdminAuthorized(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const token = process.env.ZUNEX_ADMIN_TOKEN ?? process.env.ZUNEX_DEMO_TOKEN;
  if (!token) return false;
  const provided = req.headers.get("x-zunex-admin-token") ?? req.headers.get("x-zunex-demo-token");
  if (!provided) return false;
  if (provided.length !== token.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) mismatch |= provided.charCodeAt(i) ^ token.charCodeAt(i);
  return mismatch === 0;
}

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter. Keyed by client IP (or a fallback
// identifier). Good enough for the single-instance MVP; swap for Redis when
// scaling horizontally.
// ---------------------------------------------------------------------------

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 60_000; // 1 minute

/** Returns true if the request is within the limit, false if rate-limited. */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number = DEFAULT_WINDOW_MS,
): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfterMs: 0 };
  }
  if (bucket.count >= max) {
    return { ok: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true, remaining: max - bucket.count, retryAfterMs: 0 };
}

/** Extract a stable client identifier for rate limiting. */
export function clientKey(req: NextRequest, suffix = ""): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${ip}${suffix ? ":" + suffix : ""}`;
}

/** Convenience: rate-limit a request and return a Response if blocked. */
export function rateLimitOrResponse(
  req: NextRequest,
  max: number,
  windowMs: number = DEFAULT_WINDOW_MS,
  suffix = "",
): Response | null {
  const { ok, retryAfterMs } = rateLimit(clientKey(req, suffix), max, windowMs);
  if (!ok) {
    const retryAfter = Math.ceil(retryAfterMs / 1000);
    return new Response(
      JSON.stringify({ ok: false, code: "rate_limited", message: "Too many requests" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      },
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Input validation — reject obviously malformed IDs before they touch the
// store. Station IDs are uppercase alphanumerics with an optional dash; plan
// IDs are lowercase alphanumerics.
// ---------------------------------------------------------------------------

const STATION_ID_RE = /^[A-Z0-9-]{2,32}$/;
const PLAN_ID_RE = /^[a-z0-9]{2,16}$/;

export function isValidStationId(id: string): boolean {
  return STATION_ID_RE.test(id);
}

export function isValidPlanId(id: string): boolean {
  return PLAN_ID_RE.test(id);
}

/** Cap request body size at 16 KiB to blunt memory-pressure floods. */
export const MAX_BODY_BYTES = 16 * 1024;
