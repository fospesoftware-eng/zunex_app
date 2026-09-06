import { jsonError, jsonOk } from "@/lib/server/http";
import { isAdminAuthorized } from "@/lib/server/security";
import { getAllTelemetry } from "@/lib/server/mqtt";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Latest MQTT telemetry for every station seen on the broker.
 * Built for the upcoming admin backend; not used by the customer app.
 * Requires admin authorization in production.
 */
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) return jsonError("unauthorized", "Not available", 403);
  return jsonOk({ stations: getAllTelemetry(), serverTime: Date.now() });
}
