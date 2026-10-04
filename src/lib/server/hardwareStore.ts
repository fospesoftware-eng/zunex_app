// Hardware/MQTT config store — backed by Supabase (public.hardware).
// Falls back to in-memory seed if Supabase is not configured.

import { getAdminSupabase } from "@/lib/server/supabase";

export type ConnectionStatus = "online" | "offline" | "connecting" | "unknown";

export interface HardwareConfig {
  id: string;
  stationId: string;
  deviceId: string;
  brokerUrl: string;
  mqttTopic: string;
  mqttPort: number;
  username: string;
  password: string;
  firmwareVersion: string;
  heartbeatIntervalMs: number;
  lastSeenAt: number | null;
  connectionStatus: ConnectionStatus;
  telemetryEnabled: boolean;
  updatedAt: number;
}

// ── Supabase row → HardwareConfig ────────────────────────────────────────
function rowToHardware(row: Record<string, unknown>): HardwareConfig {
  return {
    id: String(row.id),
    stationId: String(row.station_id),
    deviceId: String(row.device_id ?? ""),
    brokerUrl: String(row.broker_url ?? ""),
    mqttTopic: String(row.mqtt_topic ?? ""),
    mqttPort: Number(row.mqtt_port ?? 1883),
    username: String(row.username ?? ""),
    password: String(row.password ?? ""),
    firmwareVersion: String(row.firmware_version ?? ""),
    heartbeatIntervalMs: Number(row.heartbeat_interval_ms ?? 30000),
    lastSeenAt: row.last_seen_at ? Number(row.last_seen_at) : null,
    connectionStatus: (row.connection_status as ConnectionStatus) ?? "offline",
    telemetryEnabled: Boolean(row.telemetry_enabled ?? true),
    updatedAt: row.updated_at ? Number(row.updated_at) : Date.now(),
  };
}

function hardwareToRow(h: Omit<HardwareConfig, "id" | "updatedAt" | "lastSeenAt">): Record<string, unknown> {
  return {
    station_id: h.stationId,
    device_id: h.deviceId,
    broker_url: h.brokerUrl,
    mqtt_topic: h.mqttTopic,
    mqtt_port: h.mqttPort,
    username: h.username,
    password: h.password,
    firmware_version: h.firmwareVersion,
    heartbeat_interval_ms: h.heartbeatIntervalMs,
    connection_status: h.connectionStatus,
    telemetry_enabled: h.telemetryEnabled,
    updated_at: Date.now(),
  };
}

export async function listHardware(): Promise<(HardwareConfig & { deviceModel?: string; installType?: string })[]> {
  const sb = getAdminSupabase();
  if (!sb) return [];
  const [hwRes, stRes] = await Promise.all([
    sb.from("hardware").select("*").order("station_id"),
    sb.from("stations").select("id, device_model, install_type"),
  ]);
  if (hwRes.error) {
    console.error("[hardwareStore] list error:", hwRes.error);
    return [];
  }
  const stationMap = new Map(
    (stRes.data ?? []).map((s) => [String(s.id), { deviceModel: s.device_model, installType: s.install_type }]),
  );
  return (hwRes.data ?? []).map((row) => {
    const hw = rowToHardware(row);
    const st = stationMap.get(hw.stationId);
    return {
      ...hw,
      deviceModel: st?.deviceModel ? String(st.deviceModel) : undefined,
      installType: st?.installType ? String(st.installType) : undefined,
    };
  });
}

export async function getHardware(id: string): Promise<HardwareConfig | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("hardware").select("*").eq("id", id).single();
  if (error || !data) return null;
  return rowToHardware(data);
}

export async function getHardwareByStation(stationId: string): Promise<HardwareConfig | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("hardware").select("*").eq("station_id", stationId).single();
  if (error || !data) return null;
  return rowToHardware(data);
}

export async function upsertHardware(
  data: Omit<HardwareConfig, "id" | "updatedAt" | "lastSeenAt">,
): Promise<HardwareConfig | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const row = hardwareToRow(data);
  row.id = `hw_${data.stationId}`;
  const { data: result, error } = await sb
    .from("hardware")
    .upsert(row, { onConflict: "station_id" })
    .select()
    .single();
  if (error) {
    console.error("[hardwareStore] upsert error:", error);
    return null;
  }
  return rowToHardware(result);
}

export async function updateHardware(
  id: string,
  patch: Partial<Omit<HardwareConfig, "id">>,
): Promise<HardwareConfig | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const update: Record<string, unknown> = {};
  if (patch.stationId !== undefined) update.station_id = patch.stationId;
  if (patch.deviceId !== undefined) update.device_id = patch.deviceId;
  if (patch.brokerUrl !== undefined) update.broker_url = patch.brokerUrl;
  if (patch.mqttTopic !== undefined) update.mqtt_topic = patch.mqttTopic;
  if (patch.mqttPort !== undefined) update.mqtt_port = patch.mqttPort;
  if (patch.username !== undefined) update.username = patch.username;
  if (patch.password !== undefined) update.password = patch.password;
  if (patch.firmwareVersion !== undefined) update.firmware_version = patch.firmwareVersion;
  if (patch.heartbeatIntervalMs !== undefined) update.heartbeat_interval_ms = patch.heartbeatIntervalMs;
  if (patch.connectionStatus !== undefined) update.connection_status = patch.connectionStatus;
  if (patch.telemetryEnabled !== undefined) update.telemetry_enabled = patch.telemetryEnabled;
  if (patch.lastSeenAt !== undefined) update.last_seen_at = patch.lastSeenAt;
  update.updated_at = Date.now();

  const { data, error } = await sb
    .from("hardware")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    console.error("[hardwareStore] update error:", error);
    return null;
  }
  return rowToHardware(data);
}

export async function deleteHardware(id: string): Promise<boolean> {
  const sb = getAdminSupabase();
  if (!sb) return false;
  const { error } = await sb.from("hardware").delete().eq("id", id);
  if (error) {
    console.error("[hardwareStore] delete error:", error);
    return false;
  }
  return true;
}

/** Simulated heartbeat — kept for compatibility, now updates Supabase. */
export async function simulateHeartbeats(): Promise<void> {
  const sb = getAdminSupabase();
  if (!sb) return;
  const t = Date.now();
  const { data } = await sb.from("hardware").select("id, connection_status, last_seen_at");
  if (!data) return;
  for (const h of data) {
    if (Math.random() < 0.7) {
      const newStatus = h.connection_status !== "online" && Math.random() < 0.4 ? "online" : h.connection_status;
      await sb.from("hardware").update({ last_seen_at: t, connection_status: newStatus, updated_at: t }).eq("id", h.id);
    }
  }
}
