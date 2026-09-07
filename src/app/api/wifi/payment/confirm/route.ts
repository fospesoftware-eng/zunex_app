import { jsonError, jsonOk, scenarioFromRequest } from "@/lib/server/http";
import { wifiService } from "@/lib/server/wifiService";
import { rateLimitOrResponse } from "@/lib/server/security";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Verify the WiFi payment with the provider and unlock the data allowance.
 * Idempotent — verifying an already-verified intent returns success.
 */
export async function POST(req: NextRequest) {
  const blocked = rateLimitOrResponse(req, 20, 60_000, "wifi:confirm");
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const intentId = body?.intentId as string | undefined;
  if (!intentId) return jsonError("invalid_request", undefined, 400);

  const scenario = scenarioFromRequest(req);
  const result = await wifiService.confirmPayment(intentId, scenario);
  if (!result.ok) {
    const status = result.code === "payment_failed" ? 402 : 400;
    return jsonError(result.code, undefined, status);
  }
  return jsonOk({ ok: true });
}
