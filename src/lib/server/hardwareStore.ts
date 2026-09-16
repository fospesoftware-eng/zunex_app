// ---------------------------------------------------------------------------
// Hardware/MQTT config store — JSON file-backed with graceful in-memory
// fallback. File lives at ./data/hardware.json relative to CWD.
// Includes a simulated heartbeat tick that randomises online/offline statuses.
// ---------------------------------------------------------------------------

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
// Kick off the simulated heartbeat scheduler (guarded against HMR duplicates).
import "./heartbeat";

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

const DATA_DIR = join(process.cwd(), "data");
const FILE = join(DATA_DIR, "hardware.json");

let memoryOnlyFallback = false;

function ensureDataDir(): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    writeFileSync(join(DATA_DIR, ".write_test"), "ok");
  } catch {
    memoryOnlyFallback = true;
  }
}

function now(): number {
  return Date.now();
}

function seed(): HardwareConfig[] {
  const t = now();
  const stations = ["ZNX-A1", "ZNX-B2", "ZNX-L1", "ZNX-K3"];
  return stations.map((stationId, i) => ({
    id: `hw_${stationId}`,
    stationId,
    deviceId: `ZXN-DVC-${stationId}-00${i + 1}`,
    brokerUrl: "mqtt://broker.zunexglobal.com",
    mqttTopic: `zunex/stations/${stationId}`,
    mqttPort: 1883,
    username: "zunex_device",
    password: `dev_${stationId.toLowerCase()}`,
    firmwareVersion: `v2.${i}.4`,
    heartbeatIntervalMs: 30000,
    lastSeenAt: t - (i * 2 + 1) * 1000, // slightly staggered
    connectionStatus: i < 3 ? "online" : "offline",
    telemetryEnabled: true,
    updatedAt: t,
  }));
}

let cached: HardwareConfig[] | null = null;

function load(): HardwareConfig[] {
  ensureDataDir();
  if (memoryOnlyFallback) return seed();
  try {
    if (existsSync(FILE)) {
      const raw = readFileSync(FILE, "utf-8");
      return JSON.parse(raw) as HardwareConfig[];
    }
  } catch {
    // fall through
  }
  const fresh = seed();
  write(fresh);
  return fresh;
}

function write(items: HardwareConfig[]): void {
  if (memoryOnlyFallback) return;
  try {
    ensureDataDir();
    writeFileSync(FILE, JSON.stringify(items, null, 2), "utf-8");
  } catch {
    memoryOnlyFallback = true;
  }
}

function all(): HardwareConfig[] {
  if (!cached) cached = load();
  return cached;
}

function persist(): void {
  write(all());
}

export function listHardware(): HardwareConfig[] {
  return all().map((h) => ({ ...h }));
}

export function getHardware(id: string): HardwareConfig | null {
  const h = all().find((x) => x.id === id);
  return h ? { ...h } : null;
}

export function getHardwareByStation(stationId: string): HardwareConfig | null {
  const h = all().find((x) => x.stationId === stationId);
  return h ? { ...h } : null;
}

export function upsertHardware(
  data: Omit<HardwareConfig, "id" | "updatedAt" | "lastSeenAt">,
): HardwareConfig {
  const items = all();
  const existing = items.find((x) => x.stationId === data.stationId);
  if (existing) {
    const updated: HardwareConfig = { ...existing, ...data, updatedAt: now() };
    const idx = items.indexOf(existing);
    items[idx] = updated;
    persist();
    return { ...updated };
  }
  const created: HardwareConfig = {
    ...data,
    id: `hw_${data.stationId}`,
    lastSeenAt: null,
    updatedAt: now(),
  };
  items.push(created);
  persist();
  return { ...created };
}

export function updateHardware(
  id: string,
  patch: Partial<Omit<HardwareConfig, "id">>,
): HardwareConfig | null {
  const items = all();
  const existing = items.find((x) => x.id === id);
  if (!existing) return null;
  const updated: HardwareConfig = { ...existing, ...patch, updatedAt: now() };
  const idx = items.indexOf(existing);
  items[idx] = updated;
  persist();
  return { ...updated };
}

export function deleteHardware(id: string): boolean {
  const items = all();
  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1) return false;
  items.splice(idx, 1);
  persist();
  return true;
}

/**
 * Simulated heartbeat tick — bumps lastSeenAt for ~70% of devices and flips
 * some online/offline statuses randomly so the dashboard feels live.
 */
export function simulateHeartbeats(): void {
  const items = all();
  const t = now();
  let changed = false;
  for (const h of items) {
    if (Math.random() < 0.7) {
      h.lastSeenAt = t;
      // If lastSeenAt was old, bring it online
      if (h.connectionStatus !== "online" && Math.random() < 0.4) {
        h.connectionStatus = "online";
        changed = true;
      }
    } else {
      // ~30% of devices miss heartbeat — some go offline
      if (h.connectionStatus === "online" && Math.random() < 0.25) {
        h.connectionStatus = "offline";
        changed = true;
      }
    }
  }
  // Always bump updatedAt so callers know something happened
  for (const h of items) h.updatedAt = t;
  persist();
}
