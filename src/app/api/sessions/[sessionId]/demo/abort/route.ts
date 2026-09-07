import { jsonError, jsonOk } from "@/lib/server/http";
import { isDemoAuthorized, rateLimitOrResponse } from "@/lib/server/security";
import { sessionService } from "@/lib/server/sessionService";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * DEMO ONLY — forcibly abort any session (incl. a live charging one) so the
 * station frees up and a fresh demo run can begin. Requires the demo header;
 * production requests never send it (and also require ZUNEX_DEMO_TOKEN).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const blocked = rateLimitOrResponse(req, 10, 60_000, "demo:abort");
  if (blocked) return blocked;

  const demoHeader = req.headers.get("x-zunex-demo");
  if (!demoHeader) return jsonError("invalid_request", "Not available", 403);
  if (!isDemoAuthorized(req)) return jsonError("invalid_request", "Not available", 403);

  const { sessionId } = await params;
  const ok = sessionService.abortForDemo(sessionId);
  // Idempotent: an already-gone session is still a success for teardown.
  return jsonOk({ ok });
}
