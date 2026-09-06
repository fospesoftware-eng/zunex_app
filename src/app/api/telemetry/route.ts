import { jsonOk } from "@/lib/server/http";
import { getAllTelemetry } from "@/lib/server/mqtt";

export const dynamic = "force-dynamic";

/**
 * Latest MQTT telemetry for every station seen on the broker.
 * Built for the upcoming admin backend; not used by the customer app.
 */
export async function GET() {
  return jsonOk({ stations: getAllTelemetry(), serverTime: Date.now() });
}
