import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { listHardware, upsertHardware } from "@/lib/server/hardwareStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  return jsonOk(listHardware());
}

interface UpsertBody {
  stationId?: string;
  deviceId?: string;
  brokerUrl?: string;
  mqttTopic?: string;
  mqttPort?: number;
  username?: string;
  password?: string;
  firmwareVersion?: string;
  heartbeatIntervalMs?: number;
  connectionStatus?: "online" | "offline" | "connecting" | "unknown";
  telemetryEnabled?: boolean;
  deviceModel?: "core" | "plus";
  installType?: "car" | "mall" | "retail" | "outdoor" | "highway" | "office";
  city?: string;
  lat?: number;
  lng?: number;
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: UpsertBody;
  try {
    body = (await req.json()) as UpsertBody;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!body.stationId || !body.deviceId) {
    return jsonError("invalid_request", "stationId and deviceId are required");
  }
  const h = upsertHardware({
    stationId: body.stationId,
    deviceId: body.deviceId,
    brokerUrl: body.brokerUrl ?? "mqtt://broker.zunexglobal.com",
    mqttTopic: body.mqttTopic ?? `zunex/stations/${body.stationId}`,
    mqttPort: body.mqttPort ?? 1883,
    username: body.username ?? "",
    password: body.password ?? "",
    firmwareVersion: body.firmwareVersion ?? "v1.0.0",
    heartbeatIntervalMs: body.heartbeatIntervalMs ?? 30000,
    connectionStatus: body.connectionStatus ?? "unknown",
    telemetryEnabled: body.telemetryEnabled ?? true,
    deviceModel: body.deviceModel ?? "core",
    installType: body.installType ?? "office",
    city: body.city ?? "",
    lat: body.lat ?? 0,
    lng: body.lng ?? 0,
  });
  return jsonOk(h, { status: 201 });
}
