import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { listHardware, createHardware, checkDeviceIdUnique } from "@/lib/server/hardwareStore";
import { logAudit } from "@/lib/server/audit";

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
  deviceType?: "zunex_one" | "zunex_plus";
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
  if (body.deviceType && !["zunex_one", "zunex_plus"].includes(body.deviceType)) {
    return jsonError("invalid_request", "deviceType must be zunex_one or zunex_plus");
  }
  // Uniqueness check
  const unique = await checkDeviceIdUnique(body.deviceId);
  if (!unique) {
    return jsonError("device_id_taken", `Device ID "${body.deviceId}" already exists — must be unique`, 409);
  }
  const h = await createHardware({
    stationId: body.stationId,
    deviceId: body.deviceId,
    deviceType: body.deviceType ?? "zunex_one",
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
  await logAudit(auth.admin.email, "hardware-added", `Added ${h.deviceType === "zunex_plus" ? "Zunex Plus" : "Zunex One"} device ${h.deviceId} on ${h.stationId}`, h.id);
  return jsonOk(h, { status: 201 });
}
