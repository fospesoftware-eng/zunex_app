// ---------------------------------------------------------------------------
// Admin config store — JSON file-backed with graceful in-memory fallback.
// File lives at ./data/admin-config.json relative to CWD. On import it loads
// from disk if present; otherwise seeds sensible defaults. Every mutation
// writes synchronously. If the filesystem is read-only (e.g. Replit preview)
// we silently fall back to in-memory only.
// ---------------------------------------------------------------------------

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
// Ensure the simulated heartbeat scheduler is alive whenever any server
// module imports configStore. Guarded against HMR duplicates inside the file.
import "./heartbeat";

export interface AdminSettings {
  brandName: string;
  tagline: string;
  supportEmail: string;
  commissionRatePct: number;
  defaultPowerWatts: number;
  maintenanceStations: string[];
  commonConfig: Record<string, string | number | boolean>;
}

export interface OrderStrategy {
  id: string;
  timeSlot: string;
  deviceRatioPct: number;
  enabled: boolean;
  createdAt: number;
}

export interface Partner {
  id: string;
  name: string;
  type: "merchant" | "enterprise" | "fleet" | "institution";
  contactName: string;
  contactEmail: string;
  stationsOwned: number;
  commissionRatePct: number;
  active: boolean;
  joinedAt: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "viewer";
  active: boolean;
  lastLoginAt: number | null;
}

export interface AdminConfig {
  settings: AdminSettings;
  strategies: OrderStrategy[];
  partners: Partner[];
  admins: AdminUser[];
  seedOverride: Record<string, unknown>;
}

const DATA_DIR = join(process.cwd(), "data");
const CONFIG_FILE = join(DATA_DIR, "admin-config.json");

let memoryOnlyFallback = false;

/** Create ./data/ on disk if missing. Silently sets fallback if read-only. */
export function ensureDataDir(): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    // Test writability.
    const testFile = join(DATA_DIR, ".write_test");
    writeFileSync(testFile, "ok");
  } catch {
    memoryOnlyFallback = true;
  }
}

function defaults(): AdminConfig {
  const now = Date.now();
  return {
    settings: {
      brandName: "ZUNEX",
      tagline: "Charge forward.",
      supportEmail: "support@zunexglobal.com",
      commissionRatePct: 20,
      defaultPowerWatts: 30,
      maintenanceStations: [],
      commonConfig: {
        maxSessionsPerStation: 1,
        sessionGraceMinutes: 2,
      },
    },
    strategies: [
      { id: "strat_09521000", timeSlot: "09:52-10:00", deviceRatioPct: 30, enabled: true, createdAt: now },
      { id: "strat_15531610", timeSlot: "15:53-16:10", deviceRatioPct: 45, enabled: true, createdAt: now },
      { id: "strat_18072124", timeSlot: "18:07-21:24", deviceRatioPct: 60, enabled: true, createdAt: now },
      { id: "strat_21032354", timeSlot: "21:03-23:54", deviceRatioPct: 25, enabled: true, createdAt: now },
    ],
    partners: [
      {
        id: "partner_001",
        name: "Prestige Tech Park",
        type: "enterprise",
        contactName: "Priya Menon",
        contactEmail: "priya@prestigetp.example",
        stationsOwned: 12,
        commissionRatePct: 18,
        active: true,
        joinedAt: now,
      },
      {
        id: "partner_002",
        name: "Urban Charge Hub",
        type: "merchant",
        contactName: "Ravi Sharma",
        contactEmail: "ravi@urbancharge.example",
        stationsOwned: 8,
        commissionRatePct: 22,
        active: true,
        joinedAt: now,
      },
    ],
    admins: [
      {
        id: "adm_super",
        name: "ZUNEX Super Admin",
        email: "admin@zunexglobal.com",
        role: "super_admin",
        active: true,
        lastLoginAt: null,
      },
    ],
    seedOverride: {},
  };
}

let cached: AdminConfig | null = null;

function load(): AdminConfig {
  ensureDataDir();
  if (memoryOnlyFallback) return defaults();
  try {
    if (existsSync(CONFIG_FILE)) {
      const raw = readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(raw) as AdminConfig;
    }
  } catch {
    // Fall through to defaults.
  }
  const fresh = defaults();
  write(fresh);
  return fresh;
}

function write(cfg: AdminConfig): void {
  if (memoryOnlyFallback) return;
  try {
    ensureDataDir();
    writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
  } catch {
    memoryOnlyFallback = true;
  }
}

/** Getter — returns a deep copy so callers can't mutate the store directly. */
export function adminConfig(): AdminConfig {
  if (!cached) cached = load();
  return JSON.parse(JSON.stringify(cached)) as AdminConfig;
}

/** Replace the entire config on disk and in memory. */
export function saveAdminConfig(cfg: AdminConfig): void {
  cached = JSON.parse(JSON.stringify(cfg)) as AdminConfig;
  write(cached);
}

/** Reset to seeded defaults. */
export function resetAdminConfig(): AdminConfig {
  const d = defaults();
  saveAdminConfig(d);
  return adminConfig();
}

/** Convenience id generator, scoped to this module. */
export function newId(prefix: string): string {
  const n = Math.floor(100000 + Math.random() * 899999);
  return `${prefix}_${n}`;
}
