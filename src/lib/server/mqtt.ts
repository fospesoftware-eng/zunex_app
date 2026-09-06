import mqtt, { type MqttClient } from "mqtt";
import type { PortTelemetry, StationTelemetry } from "@/lib/core/types";

// ---------------------------------------------------------------------------
// MQTT link to the ZUNEX station controllers.
//
// Topic contract (prefix default: "zunex"):
//   {prefix}/{stationId}/telemetry      ← station publishes port telemetry (JSON)
//   {prefix}/{stationId}/status         ← station publishes "online"/"offline"
//                                         (offline also via MQTT last-will)
//   {prefix}/{stationId}/cmd/start      ← server publishes start command
//   {prefix}/{stationId}/cmd/stop       ← server publishes stop command
//   {prefix}/{stationId}/ack/start      ← station acknowledges start
//   {prefix}/{stationId}/ack/stop       ← station acknowledges stop
//
// The client is created lazily and only when ZUNEX_MQTT_URL is configured.
// With no broker configured (current default) the layer is inert and the
// mock hardware keeps the demo/preview flows working.
// ---------------------------------------------------------------------------

const PREFIX = process.env.ZUNEX_MQTT_TOPIC_PREFIX ?? "zunex";

export function isMqttConfigured(): boolean {
  return Boolean(process.env.ZUNEX_MQTT_URL);
}

/** Latest telemetry per station, keyed by stationId. */
const telemetryByStation = new Map<string, StationTelemetry>();

export function getStationTelemetry(stationId: string): StationTelemetry | null {
  return telemetryByStation.get(stationId) ?? null;
}

export function getAllTelemetry(): StationTelemetry[] {
  return [...telemetryByStation.values()];
}

function applyPortTelemetry(port: PortTelemetry): void {
  const existing =
    telemetryByStation.get(port.stationId) ??
    ({ stationId: port.stationId, online: true, lastSeenAt: 0, ports: {} } as StationTelemetry);
  existing.ports[port.portId] = port;
  existing.online = true;
  existing.lastSeenAt = Date.now();
  telemetryByStation.set(port.stationId, existing);
}

function applyStationStatus(stationId: string, online: boolean): void {
  const existing =
    telemetryByStation.get(stationId) ??
    ({ stationId, online, lastSeenAt: 0, ports: {} } as StationTelemetry);
  existing.online = online;
  if (online) existing.lastSeenAt = Date.now();
  telemetryByStation.set(stationId, existing);
}

let client: MqttClient | null = null;
let connecting: Promise<MqttClient> | null = null;

export function getMqttClient(): Promise<MqttClient> | null {
  if (!isMqttConfigured()) return null;
  if (client) return Promise.resolve(client);
  if (!connecting) connecting = createClient();
  return connecting;
}

function createClient(): Promise<MqttClient> {
  return new Promise((resolve) => {
    const c = mqtt.connect(process.env.ZUNEX_MQTT_URL as string, {
      username: process.env.ZUNEX_MQTT_USERNAME,
      password: process.env.ZUNEX_MQTT_PASSWORD,
      clientId: process.env.ZUNEX_MQTT_CLIENT_ID ?? `zunex-server-${process.pid}`,
      reconnectPeriod: 5000,
      connectTimeout: 8000,
      // Sessions survive brief disconnects so no telemetry/command acks are lost.
      clean: false,
    });

    c.on("connect", () => {
      c.subscribe([
        `${PREFIX}/+/telemetry`,
        `${PREFIX}/+/status`,
        `${PREFIX}/+/ack/start`,
        `${PREFIX}/+/ack/stop`,
      ]);
      client = c;
      resolve(c);
    });

    c.on("message", (topic, payload) => {
      const parts = topic.split("/");
      // [prefix, stationId, kind]
      if (parts.length < 3 || parts[0] !== PREFIX) return;
      const [, stationId, kind] = parts;
      const raw = payload.toString();

      try {
        if (kind === "telemetry") {
          const parsed = JSON.parse(raw) as PortTelemetry | PortTelemetry[];
          for (const port of Array.isArray(parsed) ? parsed : [parsed]) {
            if (port && typeof port.portId === "string") {
              applyPortTelemetry({ ...port, stationId, receivedAt: Date.now() });
            }
          }
        } else if (kind === "status") {
          applyStationStatus(stationId, raw.trim().toLowerCase() === "online");
        } else if (kind.startsWith("ack/")) {
          // Ack resolution lives in the waiters registry below.
          const action = kind.slice(4) as "start" | "stop";
          const ack = JSON.parse(raw) as { requestId?: string; ok?: boolean; code?: string };
          resolveAck(stationId, action, ack);
        }
      } catch {
        // Malformed frame from a station — ignore; telemetry staleness covers us.
      }
    });

    c.on("error", () => {
      /* reconnectPeriod handles retries; consumers see staleness instead */
    });
  });
}

// ---------------------------------------------------------------------------
// Command acks — one-shot waiters keyed by `${stationId}/${action}/${requestId}`
// ---------------------------------------------------------------------------

type Ack = { requestId?: string; ok?: boolean; code?: string };
const ackWaiters = new Map<string, (ack: Ack) => void>();

function resolveAck(stationId: string, action: "start" | "stop", ack: Ack): void {
  const key = ack.requestId
    ? `${stationId}/${action}/${ack.requestId}`
    : `${stationId}/${action}/*`;
  const waiter = ackWaiters.get(key);
  if (waiter) {
    ackWaiters.delete(key);
    waiter(ack);
  }
}

/** Resolves when the station acks the command, or null on timeout. */
export function awaitCommandAck(
  stationId: string,
  action: "start" | "stop",
  requestId: string,
  timeoutMs: number,
): Promise<Ack | null> {
  const key = `${stationId}/${action}/${requestId}`;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      // Accept a broadcast ack too if the specific one never arrives.
      ackWaiters.delete(key);
      resolve(null);
    }, timeoutMs);
    ackWaiters.set(key, (ack) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

export async function publishCommand(
  stationId: string,
  action: "start" | "stop",
  payload: Record<string, unknown>,
): Promise<void> {
  const c = await getMqttClient();
  c?.publish(`${PREFIX}/${stationId}/cmd/${action}`, JSON.stringify(payload), { qos: 1 });
}

export const MQTT_PREFIX = PREFIX;
