import { jsonError, jsonOk, scenarioFromRequest } from "@/lib/server/http";
import { sessionService } from "@/lib/server/sessionService";
import { rateLimitOrResponse } from "@/lib/server/security";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Payment verified → ask the station hardware to start. Response reflects the
 * `starting` state; confirmation arrives via the session stream when the
 * hardware acknowledges. Idempotent while starting/active. Retrying from a
 * hardware failure re-issues the command.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const blocked = rateLimitOrResponse(req, 20, 60_000, "sessions:start");
  if (blocked) return blocked;

  const { sessionId } = await params;
  const scenario = scenarioFromRequest(req);
  const url = new URL(req.url);
  const isRetry = url.searchParams.get("retry") === "1";

  const result = sessionService.requestStart(sessionId, scenario, isRetry);
  if (!result.ok) {
    const status = result.code === "session_not_found" ? 404 : 409;
    return jsonError(result.code, undefined, status);
  }
  const snapshot = sessionService.snapshot(sessionId);
  return jsonOk({ snapshot });
}
