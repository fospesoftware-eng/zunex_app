import { jsonError, jsonOk } from "@/lib/server/http";
import { isDemoAuthorized, rateLimitOrResponse } from "@/lib/server/security";
import { sessionService } from "@/lib/server/sessionService";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * DEMO ONLY — force a payment outcome from the demo panel so the flow can be
 * exercised without the UPI hops: { outcome: "succeed" | "fail" }.
 *
 * In production this endpoint requires `ZUNEX_DEMO_TOKEN` to be set and the
 * matching `x-zunex-demo-token` header — otherwise it is disabled. Without
 * this, an attacker could mark any pending payment as paid for free.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const blocked = rateLimitOrResponse(req, 10, 60_000, "demo:payment");
  if (blocked) return blocked;

  const demoHeader = req.headers.get("x-zunex-demo");
  if (!demoHeader) return jsonError("invalid_request", "Not available", 403);
  if (!isDemoAuthorized(req)) return jsonError("invalid_request", "Not available", 403);

  const { sessionId } = await params;
  let outcome: "succeed" | "fail" = "succeed";
  try {
    const body = (await req.json()) as { outcome?: string };
    if (body.outcome === "fail") outcome = "fail";
  } catch {
    /* default succeed */
  }

  const res = sessionService.simulatePayment(sessionId, outcome);
  if (!res.ok) return jsonError(res.code ?? "invalid_state", undefined, 409);
  return jsonOk({ ok: true });
}
