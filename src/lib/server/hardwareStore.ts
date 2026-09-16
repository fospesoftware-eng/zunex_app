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
  deviceModel: "core" | "plus";
  installType: "car" | "mall" | "retail" | "outdoor" | "highway" | "office";
  city: string;
  lat: number;
  lng: number;
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
  const stationData = [
    { stationId: "ZNX-A1", deviceModel: "plus" as const, installType: "mall" as const, city: "Mumbai", lat: 19.0760, lng: 72.8777, firmware: "v2.0.4" },
    { stationId: "ZNX-B2", deviceModel: "core" as const, installType: "retail" as const, city: "Bangalore", lat: 12.9716, lng: 77.5946, firmware: "v2.1.4" },
    { stationId: "ZNX-L1", deviceModel: "plus" as const, installType: "highway" as const, city: "Delhi", lat: 28.6139, lng: 77.2090, firmware: "v2.2.4" },
    { stationId: "ZNX-K3", deviceModel: "core" as const, installType: "office" as const, city: "Chennai", lat: 13.0827, lng: 80.2707, firmware: "v2.3.4" },
    { stationId: "ZNX-M1", deviceModel: "plus" as const, installType: "car" as const, city: "Hyderabad", lat: 17.3850, lng: 78.4867, firmware: "v2.4.4" },
    { stationId: "ZNX-C1", deviceModel: "core" as const, installType: "outdoor" as const, city: "Kolkata", lat: 22.5726, lng: 88.3639, firmware: "v2.5.4" },
  ];
  return stationData.map((s, i) => ({
    id: `hw_${s.stationId}`,
    stationId: s.stationId,
    deviceId: `ZXN-DVC-${s.stationId}-00${i + 1}`,
    brokerUrl: "mqtt://broker.zunexglobal.com",
    mqttTopic: `zunex/stations/${s.stationId}`,
    mqttPort: 1883,
    username: "zunex_device",
    password: `dev_${s.stationId.toLowerCase()}`,
    firmwareVersion: s.firmware,
    heartbeatIntervalMs: 30000,
    lastSeenAt: t - (i * 2 + 1) * 1000,
    connectionStatus: s.stationId === "ZNX-L1" ? "offline" : "online",
    telemetryEnabled: true,
    updatedAt: t,
    deviceModel: s.deviceModel,
    installType: s.installType,
    city: s.city,
    lat: s.lat,
    lng: s.lng,
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
