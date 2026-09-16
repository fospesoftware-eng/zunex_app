import type { Station, StationStatus, DeviceModel, InstallType } from "@/lib/core/types";
import { PLANS, store, type SessionRecord } from "@/lib/server/store";
import { sessionService } from "@/lib/server/sessionService";
import { getServerSupabase } from "@/lib/server/supabase";

// ---------------------------------------------------------------------------
// Station registry — Supabase LiveDB (primary), STATION_CONFIGS (fallback).
// Status is computed per request so a busy port / maintenance override / MQTT
// heartbeat shows live.
// ---------------------------------------------------------------------------

interface StationConfig {
  id: string;
  name: string;
  location: string;
  powerWatts: number;
  connector: string;
  baseStatus: Exclude<StationStatus, "busy">;
  deviceModel: DeviceModel;
  installType: InstallType;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

// Hard-coded seed — used when Supabase is unavailable OR as an in-memory
// authoritative cache on this node (faster and immune to publishable-key RLS
// blocks on writes — stations are read-only from client code anyway).
const STATION_CONFIGS: StationConfig[] = [
  { id: "ZNX-A1", name: "Zunex Gateway", location: "Gateway Mall — Level 2", powerWatts: 45, connector: "USB-C", baseStatus: "available", deviceModel: "plus", installType: "mall", city: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777 },
  { id: "ZNX-A2", name: "Zunex BKC Hub", location: "Bandra Kurla Complex", powerWatts: 45, connector: "USB-C", baseStatus: "available", deviceModel: "plus", installType: "office", city: "Mumbai", state: "Maharashtra", lat: 19.0596, lng: 72.8425 },
  { id: "ZNX-B2", name: "ZUNEX B2", location: "MG Road Store — Ground Floor", powerWatts: 30, connector: "USB-C", baseStatus: "available", deviceModel: "core", installType: "retail", city: "Bangalore", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
  { id: "ZNX-B3", name: "Zunex Whitefield", location: "Phoenix MarketCity Mall", powerWatts: 45, connector: "USB-C", baseStatus: "maintenance", deviceModel: "plus", installType: "mall", city: "Bangalore", state: "Karnataka", lat: 12.9873, lng: 77.6409 },
  { id: "ZNX-L1", name: "ZUNEX L1", location: "NH8 Rest Stop — Highway", powerWatts: 45, connector: "USB-C", baseStatus: "available", deviceModel: "plus", installType: "highway", city: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090 },
  { id: "ZNX-D2", name: "Zunex Connaught", location: "Connaught Place Charging Hub", powerWatts: 30, connector: "USB-C", baseStatus: "available", deviceModel: "core", installType: "outdoor", city: "Delhi", state: "Delhi", lat: 28.6328, lng: 77.2182 },
  { id: "ZNX-K3", name: "ZUNEX K3", location: "Chennai Tech Park — Office Bay", powerWatts: 30, connector: "USB-C", baseStatus: "available", deviceModel: "core", installType: "office", city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 },
  { id: "ZNX-K4", name: "Zunex OMR", location: "Sholinganallur — IT Corridor", powerWatts: 45, connector: "USB-C", baseStatus: "offline", deviceModel: "plus", installType: "highway", city: "Chennai", state: "Tamil Nadu", lat: 12.8844, lng: 80.2257 },
  { id: "ZNX-M1", name: "ZUNEX M1", location: "Hyundai Service Centre", powerWatts: 45, connector: "USB-C", baseStatus: "available", deviceModel: "plus", installType: "car", city: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867 },
  { id: "ZNX-H2", name: "Zunex Gachibowli", location: "Financial District Towers", powerWatts: 30, connector: "USB-C", baseStatus: "available", deviceModel: "core", installType: "office", city: "Hyderabad", state: "Telangana", lat: 17.4432, lng: 78.3520 },
  { id: "ZNX-C1", name: "ZUNEX C1", location: "Park Street Charging Hub", powerWatts: 30, connector: "USB-C", baseStatus: "available", deviceModel: "core", installType: "outdoor", city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639 },
  { id: "ZNX-C2", name: "Zunex Salt Lake", location: "Techno City Sector V", powerWatts: 45, connector: "USB-C", baseStatus: "available", deviceModel: "plus", installType: "office", city: "Kolkata", state: "West Bengal", lat: 22.5958, lng: 88.4549 },
  { id: "ZNX-P1", name: "ZUNEX P1", location: "SG Highway Mall", powerWatts: 45, connector: "USB-C", baseStatus: "available", deviceModel: "plus", installType: "mall", city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 },
  { id: "ZNX-P2", name: "Zunex Sindhu Bhavan", location: "SG Highway Service Road", powerWatts: 30, connector: "USB-C", baseStatus: "available", deviceModel: "core", installType: "car", city: "Ahmedabad", state: "Gujarat", lat: 23.0316, lng: 72.5550 },
  { id: "ZNX-J1", name: "ZUNEX J1", location: "Cuffe Parade Outpost", powerWatts: 30, connector: "USB-C", baseStatus: "available", deviceModel: "core", installType: "outdoor", city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 },
];

// --- DB-backed refresh -----------------------------------------------------

let dbCache: StationConfig[] | null = null;
let dbCacheAt = 0;
const DB_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — stations change rarely

interface DbStation {
  id: string;
  name: string;
  location: string | null;
  power_watts: number;
  connector: string;
  base_status: string;
  force_status: string | null;
  device_model: DeviceModel;
  install_type: InstallType;
  city: string | null;
  state: string | null;
  lat: number;
  lng: number;
}

async function refreshDbCache(): Promise<void> {
  const supabase = getServerSupabase();
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from("stations")
      .select("*")
      .limit(200);
    if (error) {
      console.warn("[stations] db fetch error:", error.message);
      return;
    }
    if (Array.isArray(data) && data.length > 0) {
      dbCache = data.map((d: DbStation) => ({
        id: d.id,
        name: d.name,
        location: d.location ?? "",
        powerWatts: d.power_watts ?? 45,
        connector: d.connector ?? "USB-C",
        baseStatus: (d.force_status ?? d.base_status ?? "available") as Exclude<StationStatus, "busy">,
        deviceModel: (d.device_model ?? "plus") as DeviceModel,
        installType: (d.install_type ?? "mall") as InstallType,
        city: d.city ?? "",
        state: d.state ?? "",
        lat: Number(d.lat),
        lng: Number(d.lng),
      }));
      dbCacheAt = Date.now();
    }
  } catch (e) {
    console.warn("[stations] db exception:", (e as Error).message);
  }
}

function getConfigs(): StationConfig[] {
  if (dbCache && Date.now() - dbCacheAt < DB_CACHE_TTL_MS) return dbCache;
  // Fire refresh in background (do not await)
  void refreshDbCache();
  return dbCache ?? STATION_CONFIGS;
}

// --- Status computation ----------------------------------------------------

const ACTIVE_STATES = new Set([
  "payment_successful",
  "starting",
  "charging_active",
  "stopping",
]);

function computeStatus(config: StationConfig, scenario: string): StationStatus {
  if (scenario === "station_offline") return "offline";
  if (config.baseStatus === "offline") return "offline";
  if (config.baseStatus === "maintenance") return "maintenance";
  for (const session of store.sessions.values()) {
    if (session.stationId === config.id && ACTIVE_STATES.has(session.state)) return "busy";
  }
  return "available";
}

// --- Public API ------------------------------------------------------------

export function getStation(
  stationId: string,
  scenario: string,
): { station: Station } | { error: "not_found" } {
  const configs = getConfigs();
  const config = configs.find((s) => s.id === stationId.toUpperCase());
  if (!config) return { error: "not_found" };
  sessionService.reap();
  const status = computeStatus(config, scenario);
  const station: Station = {
    id: config.id,
    name: config.name,
    location: config.location,
    status,
    powerWatts: config.powerWatts,
    connector: config.connector,
    plans: PLANS,
    deviceModel: config.deviceModel,
    installType: config.installType,
    city: config.city,
    state: config.state,
    lat: config.lat,
    lng: config.lng,
  };
  return { station };
}

export function hasActiveSessionForStation(stationId: string): boolean {
  sessionService.reap();
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

export function getAllStationConfigs(): StationConfig[] {
  return getConfigs().map((c) => ({ ...c }));
}

/** Exposed for tests / warmup — called once from src/app/api/init/route.ts. */
export function primeDbCache(): void {
  void refreshDbCache();
}
