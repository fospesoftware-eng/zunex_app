import { jsonError, jsonOk, scenarioFromRequest } from "@/lib/server/http";
import { sessionService } from "@/lib/server/sessionService";
import { rateLimitOrResponse } from "@/lib/server/security";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Ask the backend to verify the payment with the provider. The client never
 * asserts success on its own — this call is the only path to
 * `payment_successful`. Idempotent: verifying twice returns the same result.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const blocked = rateLimitOrResponse(req, 20, 60_000, "sessions:confirm");
  if (blocked) return blocked;

  const { sessionId } = await params;
  const scenario = scenarioFromRequest(req);
  const result = await sessionService.confirmPayment(sessionId, scenario);
  if (!result.ok) {
    const status = result.code === "session_not_found" ? 404 : result.code === "payment_failed" ? 402 : 409;
    return jsonError(result.code, undefined, status);
  }
  const snapshot = sessionService.snapshot(sessionId);
  return jsonOk({ snapshot });
}
