import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { listHardware, createHardware, checkDeviceIdUnique } from "@/lib/server/hardwareStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const hardware = await listHardware();
  return jsonOk(hardware);
}

interface CreateBody {
  stationId?: string;
  deviceId?: string;
  brokerUrl?: string;
  mqttTopic?: string;
  mqttPort?: number;
  clientId?: string;
  useTls?: boolean;
  username?: string;
  password?: string;
  firmwareVersion?: string;
  heartbeatIntervalMs?: number;
  connectionStatus?: "online" | "offline" | "connecting" | "unknown";
  telemetryEnabled?: boolean;
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!body.stationId || !body.deviceId) {
    return jsonError("invalid_request", "stationId and deviceId are required");
  }
  // Uniqueness check
  const unique = await checkDeviceIdUnique(body.deviceId);
  if (!unique) {
    return jsonError("device_id_taken", `Device ID "${body.deviceId}" already exists — must be unique`, 409);
  }
  const h = await createHardware({
    stationId: body.stationId,
    deviceId: body.deviceId,
    brokerUrl: body.brokerUrl ?? "mqtt://broker.zunexglobal.com",
    mqttTopic: body.mqttTopic ?? `zunex/stations/${body.stationId}`,
    mqttPort: body.mqttPort ?? 1883,
    clientId: body.clientId ?? body.deviceId,
    useTls: body.useTls ?? false,
    username: body.username ?? "",
    password: body.password ?? "",
    firmwareVersion: body.firmwareVersion ?? "v1.0.0",
    heartbeatIntervalMs: body.heartbeatIntervalMs ?? 30000,
    connectionStatus: body.connectionStatus ?? "unknown",
    telemetryEnabled: body.telemetryEnabled ?? true,
  });
  if (!h) return jsonError("db_error", "Failed to create hardware");
  return jsonOk(h, { status: 201 });
}
