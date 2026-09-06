import { jsonError, jsonOk } from "@/lib/server/http";
import { sessionService } from "@/lib/server/sessionService";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Cancel a session. Only meaningful before payment is captured (or after a
 * hardware start failure, where it acts as "release and refund").
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const result = sessionService.cancel(sessionId);
  if (!result.ok) return jsonError(result.code ?? "invalid_state", undefined, 409);
  const snapshot = sessionService.snapshot(sessionId);
  return jsonOk({ snapshot });
}
