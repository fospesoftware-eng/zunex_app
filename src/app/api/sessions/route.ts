import { jsonError, jsonOk, scenarioFromRequest } from "@/lib/server/http";
import { getStation } from "@/lib/server/stations";
import { sessionService } from "@/lib/server/sessionService";
import {
  MAX_BODY_BYTES,
  isValidPlanId,
  isValidStationId,
  rateLimitOrResponse,
} from "@/lib/server/security";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

interface CreateBody {
  stationId?: string;
  planId?: string;
}

export async function POST(req: NextRequest) {
  // Rate-limit session creation per IP to blunt memory-pressure floods.
  const blocked = rateLimitOrResponse(req, 30, 60_000, "sessions:create");
  if (blocked) return blocked;

  // Reject oversized bodies early.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) return jsonError("invalid_request", "Body too large", 413);

  const scenario = scenarioFromRequest(req);
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!body.stationId || !body.planId) return jsonError("invalid_request");
  if (!isValidStationId(body.stationId) || !isValidPlanId(body.planId))
    return jsonError("invalid_request");

  const station = getStation(body.stationId, scenario);
  if ("error" in station) return jsonError("station_not_found", undefined, 404);
  if (station.station.status === "offline") return jsonError("station_offline", undefined, 409);
  if (station.station.status === "maintenance")
    return jsonError("station_maintenance", undefined, 409);
  if (station.station.status === "busy") return jsonError("station_busy", undefined, 409);

  const result = sessionService.createSession({
    stationId: station.station.id,
    planId: body.planId,
    idempotencyKey: req.headers.get("x-idempotency-key"),
  });
  if (!result.ok) return jsonError(result.code, undefined, 400);

  const snapshot = sessionService.snapshot(result.session.id);
  return jsonOk({ snapshot }, { status: 201 });
}
