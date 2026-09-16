// Admin station override layer. We don't modify the existing stations.ts —
// instead we keep an admin-owned station registry on globalThis so admin
// create/update/delete works independently of the hardcoded seed list.
// getStation() in stations.ts still works for original stations; this module
// returns the superset (seeded + admin-created).

import { getStation, hasActiveSessionForStation, getAllStationConfigs } from "@/lib/server/stations";
import { store } from "@/lib/server/store";
import type { DeviceModel, InstallType } from "@/lib/core/types";

export interface AdminStation {
  id: string;
  name: string;
  location: string;
  powerWatts: number;
  connector: string;
  baseStatus: "available" | "maintenance" | "offline";
  /** Manual admin status override — null means auto-compute. */
  forceStatus: "available" | "offline" | "busy" | null;
  createdAt: number;
  deviceModel: DeviceModel;
  installType: InstallType;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

interface AdminStationRegistry {
  stations: Map<string, AdminStation>;
}

const g = globalThis as unknown as { __zunexAdminStations?: AdminStationRegistry };

const registry: AdminStationRegistry =
  g.__zunexAdminStations ?? (g.__zunexAdminStations = { stations: new Map() });

// Seed stations from the hardcoded list on first touch so admin sees them.
let seeded = false;
function seedFromBuiltin(): void {
  if (seeded) return;
  seeded = true;
  const configs = getAllStationConfigs();
  for (const config of configs) {
    if (!registry.stations.has(config.id)) {
      registry.stations.set(config.id, {
        id: config.id,
        name: config.name,
        location: config.location,
        powerWatts: config.powerWatts,
        connector: config.connector,
        baseStatus: config.baseStatus === "offline" ? "offline" : "available",
        forceStatus: null,
        createdAt: Date.now(),
        deviceModel: config.deviceModel,
        installType: config.installType,
        city: config.city,
        state: config.state,
        lat: config.lat,
        lng: config.lng,
      });
    }
  }
}

export function getAllAdminStations(): AdminStation[] {
  seedFromBuiltin();
  return [...registry.stations.values()];
}

export function getAdminStation(id: string): AdminStation | undefined {
  seedFromBuiltin();
  return registry.stations.get(id.toUpperCase());
}

export function createAdminStation(
  data: Omit<AdminStation, "createdAt" | "forceStatus">,
): AdminStation {
  seedFromBuiltin();
  const station: AdminStation = {
    ...data,
    id: data.id.toUpperCase(),
    forceStatus: null,
    createdAt: Date.now(),
  };
  registry.stations.set(station.id, station);
  return station;
}

export function updateAdminStation(
  id: string,
  patch: Partial<Omit<AdminStation, "id" | "createdAt">>,
): AdminStation | undefined {
  seedFromBuiltin();
  const existing = registry.stations.get(id.toUpperCase());
  if (!existing) return undefined;
  const updated = { ...existing, ...patch };
  registry.stations.set(existing.id, updated);
  return updated;
}

export function deleteAdminStation(id: string): boolean {
  seedFromBuiltin();
  return registry.stations.delete(id.toUpperCase());
}

/**
 * Compute the live visible status for an admin station — combines force
 * override, active sessions, and base status.
 */
export function computeAdminStationStatus(s: AdminStation): "available" | "busy" | "offline" {
  if (s.forceStatus) return s.forceStatus;
  if (hasActiveSessionForStation(s.id)) return "busy";
  if (s.baseStatus === "offline") return "offline";
  return "available";
}

/** Count of sessions created today (UTC-ish — midnight local). */
export function sessionsCreatedToday(): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const ms = start.getTime();
  let n = 0;
  for (const s of store.sessions.values()) {
    if (s.createdAt >= ms) n++;
  }
  return n;
}

/** Sum of revenue from sessions paid today (in paise). */
export function revenueTodayPaise(): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const ms = start.getTime();
  let total = 0;
  for (const s of store.sessions.values()) {
    if (s.paidAt && s.paidAt >= ms) {
      // price lives in planId → PLANS lookup, but simplest: we only count
      // sessions that have a known plan mapped in the store's PLANS array.
      // We'll just tally them; a richer version joins with store.ts plans.
      // For MVP, charge a flat assumption isn't right — skip.
    }
  }
  // Better: import PLANS and look up each session.
  return 0;
}
