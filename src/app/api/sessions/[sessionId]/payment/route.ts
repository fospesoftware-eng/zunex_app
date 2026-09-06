import { jsonError, jsonOk } from "@/lib/server/http";
import { sessionService } from "@/lib/server/sessionService";
import { rateLimitOrResponse } from "@/lib/server/security";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** Create (or idempotently return) the UPI payment intent for a session. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const blocked = rateLimitOrResponse(req, 20, 60_000, "sessions:payment");
  if (blocked) return blocked;

  const { sessionId } = await params;
  const result = await sessionService.createPaymentIntent(sessionId);
  if (!result.ok) return jsonError(result.code, undefined, result.code === "session_not_found" ? 404 : 400);
  return jsonOk({ intent: result.intent });
}
