import type { StationPayload } from "@/lib/core/types";
import { getStation } from "@/lib/server/stations";
import { jsonError, jsonOk, scenarioFromRequest } from "@/lib/server/http";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> },
) {
  const { stationId } = await params;
  const scenario = scenarioFromRequest(req);
  const result = getStation(stationId, scenario);
  if ("error" in result) return jsonError("station_not_found", undefined, 404);
  const payload: StationPayload = { station: result.station, serverTime: Date.now() };
  return jsonOk(payload);
}
