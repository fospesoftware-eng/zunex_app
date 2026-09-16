// Shared admin auth helper — every /api/admin/* route uses this.
import type { NextRequest } from "next/server";

const HEADER = "x-zunex-admin-token";

/**
 * Returns `{ ok: true }` if the request is authorized, otherwise
 * `{ ok: false, response }` with a 401 JSON response.
 *
 * Rules:
 *  - If ZUNEX_ADMIN_TOKEN is set in env, the request header must match it.
 *  - If ZUNEX_ADMIN_TOKEN is NOT set, we allow requests in dev (NODE_ENV=development)
 *    but block in production so an accidental unguarded deploy doesn't leak.
 */
export function requireAdmin(
  req: NextRequest | Request,
): { ok: true } | { ok: false; response: Response } {
  const expected = process.env.ZUNEX_ADMIN_TOKEN;

  if (expected) {
    const actual = req.headers.get(HEADER);
    if (actual !== expected) {
      return {
        ok: false,
        response: Response.json(
          { ok: false, code: "unauthorized", message: "Invalid admin token" },
          { status: 401 },
        ),
      };
    }
    return { ok: true };
  }

  // No token configured — dev-only access.
  if (process.env.NODE_ENV === "development") {
    return { ok: true };
  }

  return {
    ok: false,
    response: Response.json(
      {
        ok: false,
        code: "unauthorized",
        message: "Admin access is disabled — configure ZUNEX_ADMIN_TOKEN",
      },
      { status: 401 },
    ),
  };
}
