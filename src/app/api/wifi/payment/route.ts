import { jsonError, jsonOk, scenarioFromRequest } from "@/lib/server/http";
import { wifiService } from "@/lib/server/wifiService";
import { rateLimitOrResponse } from "@/lib/server/security";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Create a payment intent for a WiFi data add-on. Returns UPI app targets so
 * the client can show the same payment simulator used for charging.
 */
export async function POST(req: NextRequest) {
  const blocked = rateLimitOrResponse(req, 20, 60_000, "wifi:payment");
  if (blocked) return blocked;

  const body = await req.json().catch(() => ({}));
  const planId = body?.planId as string | undefined;
  if (!planId) return jsonError("invalid_request", undefined, 400);

  const scenario = scenarioFromRequest(req);
  const result = await wifiService.createPaymentIntent(planId, scenario);
  if (!result.ok) {
    return jsonError(result.code, undefined, 400);
  }
  return jsonOk({ intent: result.intent, plan: result.plan, wifiId: result.wifiId });
}
