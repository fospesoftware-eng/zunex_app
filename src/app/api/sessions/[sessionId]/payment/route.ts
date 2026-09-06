import { jsonError, jsonOk } from "@/lib/server/http";
import { sessionService } from "@/lib/server/sessionService";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** Create (or idempotently return) the UPI payment intent for a session. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const result = await sessionService.createPaymentIntent(sessionId);
  if (!result.ok) return jsonError(result.code, undefined, result.code === "session_not_found" ? 404 : 400);
  return jsonOk({ intent: result.intent });
}
