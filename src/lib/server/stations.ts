import type { Station, StationStatus } from "@/lib/core/types";
import { PLANS, store, type SessionRecord } from "@/lib/server/store";

// ---------------------------------------------------------------------------
// Station registry. In production this becomes a DB/API backed adapter.
// `status` is computed per request so a busy port is reflected live.
// ---------------------------------------------------------------------------

interface StationConfig {
  id: string;
  name: string;
  location: string;
  powerWatts: number;
  connector: string;
  baseStatus: Exclude<StationStatus, "busy">;
}

const STATION_CONFIGS: StationConfig[] = [
  {
    id: "ZNX-A1",
    name: "Zunex One",
    location: "Level 2 · Prestige Tech Park",
    powerWatts: 30,
    connector: "USB-C",
    baseStatus: "available",
  },
  {
    id: "ZNX-B2",
    name: "ZUNEX B2",
    location: "Level 4 · Food Court Entrance",
    powerWatts: 30,
    connector: "USB-C",
    baseStatus: "available",
  },
  {
    id: "ZNX-L1",
    name: "ZUNEX L1",
    location: "Level 1 · Lobby Lounge",
    powerWatts: 30,
    connector: "USB-C",
    baseStatus: "available",
  },
];

const ACTIVE_STATES = new Set([
  "payment_successful",
  "starting",
  "charging_active",
  "stopping",
]);

function computeStatus(config: StationConfig, scenario: string): StationStatus {
  if (scenario === "station_offline") return "offline";
  if (config.baseStatus === "maintenance") return "maintenance";
  for (const session of store.sessions.values()) {
    if (session.stationId === config.id && ACTIVE_STATES.has(session.state)) return "busy";
  }
  return "available";
}

export function getStation(
  stationId: string,
  scenario: string,
): { station: Station } | { error: "not_found" } {
  const config = STATION_CONFIGS.find((s) => s.id === stationId.toUpperCase());
  if (!config) return { error: "not_found" };
  const status = computeStatus(config, scenario);
  const station: Station = {
    id: config.id,
    name: config.name,
    location: config.location,
    status,
    powerWatts: config.powerWatts,
    connector: config.connector,
    plans: PLANS,
  };
  return { station };
}

export function hasActiveSessionForStation(stationId: string): boolean {
  for (const session of store.sessions.values()) {
    if (session.stationId === stationId && ACTIVE_STATES.has(session.state)) return true;
  }
  return false;
}

export function findSessionByPlan(stationId: string, planId: string): SessionRecord | undefined {
  for (const session of store.sessions.values()) {
    if (session.stationId === stationId && session.planId === planId) return session;
  }
  return undefined;
}
