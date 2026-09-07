import { jsonError, jsonOk } from "@/lib/server/http";
import { isDemoAuthorized, rateLimitOrResponse } from "@/lib/server/security";
import { sessionService } from "@/lib/server/sessionService";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * DEMO ONLY — forcibly abort EVERY session in the store (incl. live charging)
 * so no stale charge lingers and holds any station "busy". Requires the demo
 * header; production requests never send it (and also require ZUNEX_DEMO_TOKEN).
 * Returns the number of sessions that were actually aborted.
 */
export async function POST(req: NextRequest) {
  const blocked = rateLimitOrResponse(req, 10, 60_000, "demo:abort-all");
  if (blocked) return blocked;

  const demoHeader = req.headers.get("x-zunex-demo");
  if (!demoHeader) return jsonError("invalid_request", "Not available", 403);
  if (!isDemoAuthorized(req)) return jsonError("invalid_request", "Not available", 403);

  const count = sessionService.abortAllForDemo();
  return jsonOk({ count });
}
