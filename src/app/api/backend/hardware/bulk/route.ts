import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import {
  createHardwareBulk,
  getExistingDeviceIds,
  getExistingStationIds,
  type BulkHardwareInput,
} from "@/lib/server/hardwareStore";

export const dynamic = "force-dynamic";

const MAX_ROWS = 200;

interface BulkRowBody {
  deviceId?: string;
  stationId?: string;
  brokerUrl?: string;
  mqttPort?: number | string;
  mqttTopic?: string;
  clientId?: string;
  useTls?: boolean | string;
  username?: string;
  password?: string;
  firmwareVersion?: string;
  heartbeatIntervalMs?: number | string;
  telemetryEnabled?: boolean | string;
}

interface RowResult {
  row: number;
  deviceId: string;
  ok: boolean;
  error?: string;
}

function toBool(v: boolean | string | undefined, fallback: boolean): boolean {
  if (v === undefined || v === "") return fallback;
  if (typeof v === "boolean") return v;
  return ["true", "1", "yes", "y"].includes(String(v).toLowerCase().trim());
}

function toNum(v: number | string | undefined, fallback: number): number {
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  let body: { rows?: BulkRowBody[] };
  try {
    body = (await req.json()) as { rows?: BulkRowBody[] };
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const rows = body.rows ?? [];
  if (rows.length === 0) return jsonError("invalid_request", "No rows provided");
  if (rows.length > MAX_ROWS) return jsonError("invalid_request", `Max ${MAX_ROWS} rows per import`);

  const results: RowResult[] = [];
  const valid: BulkHardwareInput[] = [];

  // Pre-fetch existing device IDs + station IDs in one shot
  const deviceIds = rows.map((r) => String(r.deviceId ?? "").trim()).filter(Boolean);
  const stationIds = [...new Set(rows.map((r) => String(r.stationId ?? "").trim()).filter(Boolean))];
  const [existingDevices, existingStations] = await Promise.all([
    getExistingDeviceIds(deviceIds),
    getExistingStationIds(stationIds),
  ]);

  const seenInBatch = new Set<string>();

  rows.forEach((r, i) => {
    const rowNum = i + 1;
    const deviceId = String(r.deviceId ?? "").trim();
    const stationId = String(r.stationId ?? "").trim();

    if (!deviceId) return void results.push({ row: rowNum, deviceId: deviceId || "—", ok: false, error: "device_id required" });
    if (!/^[A-Za-z0-9-_]{3,64}$/.test(deviceId))
      return void results.push({ row: rowNum, deviceId, ok: false, error: "device_id must be 3-64 chars (A-Z 0-9 - _)" });
    if (!stationId) return void results.push({ row: rowNum, deviceId, ok: false, error: "station_id required" });
    if (!existingStations.has(stationId))
      return void results.push({ row: rowNum, deviceId, ok: false, error: `station "${stationId}" not found` });
    if (existingDevices.has(deviceId))
      return void results.push({ row: rowNum, deviceId, ok: false, error: "device_id already exists" });
    if (seenInBatch.has(deviceId))
      return void results.push({ row: rowNum, deviceId, ok: false, error: "duplicate device_id in this file" });
    seenInBatch.add(deviceId);

    valid.push({
      deviceId,
      stationId,
      brokerUrl: String(r.brokerUrl ?? "").trim() || "mqtt://broker.zunexglobal.com",
      mqttTopic: String(r.mqttTopic ?? "").trim() || `zunex/stations/${stationId}`,
      mqttPort: toNum(r.mqttPort, 1883),
      clientId: String(r.clientId ?? "").trim() || deviceId,
      useTls: toBool(r.useTls, false),
      username: String(r.username ?? "").trim(),
      password: String(r.password ?? "").trim(),
      firmwareVersion: String(r.firmwareVersion ?? "").trim() || "v1.0.0",
      heartbeatIntervalMs: toNum(r.heartbeatIntervalMs, 30000),
      telemetryEnabled: toBool(r.telemetryEnabled, true),
    });
    results.push({ row: rowNum, deviceId, ok: true });
  });

  let created: string[] = [];
  if (valid.length > 0) {
    const inserted = await createHardwareBulk(valid);
    created = inserted.map((h) => h.deviceId);
    // Mark rows that failed the DB insert
    const createdSet = new Set(created);
    for (const res of results) {
      if (res.ok && !createdSet.has(res.deviceId)) {
        res.ok = false;
        res.error = "database insert failed";
      }
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return jsonOk({
    total: rows.length,
    created: okCount,
    failed: rows.length - okCount,
    results,
  });
}
