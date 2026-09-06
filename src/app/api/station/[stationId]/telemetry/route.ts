import { jsonError, jsonOk } from "@/lib/server/http";
import { chargingHardware } from "@/lib/server/hardware";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Hardware telemetry for one station.
 *
 * GET /api/station/ZNX-A1/telemetry → latest MQTT-reported state: port
 * connection, charging status, power/voltage/current, and whatever device
 * details the station can read (model, OS, battery %, ...).
 * 404 when nothing has been reported (e.g. MQTT not configured — mock backend).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ stationId: string }> },
) {
  const { stationId } = await params;

  const telemetry = await chargingHardware.telemetry(stationId);
  if (!telemetry) {
    return jsonError("telemetry_unavailable", "No telemetry reported for this station", 404);
  }
  return jsonOk({ telemetry });
}
