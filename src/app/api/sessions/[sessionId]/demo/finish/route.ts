import { jsonError, jsonOk } from "@/lib/server/http";
import { isDemoAuthorized, rateLimitOrResponse } from "@/lib/server/security";
import { sessionService } from "@/lib/server/sessionService";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * DEMO ONLY — collapses the remaining charging time so the completion flow
 * can be demonstrated in seconds. Requires the demo header; production
 * requests never send it. In production also requires `ZUNEX_DEMO_TOKEN`.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const blocked = rateLimitOrResponse(req, 10, 60_000, "demo:finish");
  if (blocked) return blocked;

  const demoHeader = req.headers.get("x-zunex-demo");
  if (!demoHeader) return jsonError("invalid_request", "Not available", 403);
  if (!isDemoAuthorized(req)) return jsonError("invalid_request", "Not available", 403);

  const { sessionId } = await params;
  const snapshot = sessionService.collapseToEnd(sessionId);
  if (!snapshot) return jsonError("session_not_found", undefined, 404);
  return jsonOk({ snapshot });
}
