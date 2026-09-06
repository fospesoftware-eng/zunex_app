import { jsonError, jsonOk } from "@/lib/server/http";
import { sessionService } from "@/lib/server/sessionService";
import { rateLimitOrResponse } from "@/lib/server/security";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Cancel a session. Only meaningful before payment is captured (or after a
 * hardware start failure, where it acts as "release and refund").
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const blocked = rateLimitOrResponse(req, 20, 60_000, "sessions:cancel");
  if (blocked) return blocked;

  const { sessionId } = await params;
  const result = sessionService.cancel(sessionId);
  if (!result.ok) return jsonError(result.code ?? "invalid_state", undefined, 409);
  const snapshot = sessionService.snapshot(sessionId);
  return jsonOk({ snapshot });
}
