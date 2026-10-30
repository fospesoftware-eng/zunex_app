// ---------------------------------------------------------------------------
// Admin config store — backed by Supabase table public.admin_config.
// Single row key='admin_config' whose jsonb value holds the AdminConfig
// shape (settings, strategies, partners, seedOverride). Admin users are
// managed separately via Supabase Auth + public.admins.
// ---------------------------------------------------------------------------

import { getAdminSupabase } from "@/lib/server/supabase";
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
  paymentGateways: PaymentGatewayConfig;
}

export interface PaymentGatewayConfig {
  active: "cashfree" | "razorpay" | "none";
  cashfree: {
    appId: string;
    secretKey: string;
    sandbox: boolean;
  };
  razorpay: {
    keyId: string;
    keySecret: string;
    sandbox: boolean;
  };
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

export interface AdminConfig {
  settings: AdminSettings;
  strategies: OrderStrategy[];
  partners: Partner[];
  seedOverride: Record<string, unknown>;
}

const CONFIG_KEY = "admin_config";

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
      paymentGateways: {
        active: "razorpay",
        cashfree: { appId: "", secretKey: "", sandbox: true },
        razorpay: { keyId: "", keySecret: "", sandbox: true },
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
    seedOverride: {},
  };
}

/**
 * Read the admin config row. If missing, insert defaults and return them.
 * If Supabase is not configured, return in-memory defaults without crashing.
 */
export async function getAdminConfig(): Promise<AdminConfig> {
  const sb = getAdminSupabase();
  if (!sb) return defaults();

  const { data, error } = await sb
    .from("admin_config")
    .select("value")
    .eq("key", CONFIG_KEY)
    .maybeSingle();

  if (error) {
    console.error("[configStore] read failed:", error.message);
    return defaults();
  }

  if (data?.value) return data.value as AdminConfig;

  const fresh = defaults();
  const { error: insertErr } = await sb
    .from("admin_config")
    .insert({ key: CONFIG_KEY, value: fresh });
  if (insertErr) {
    console.error("[configStore] seed insert failed:", insertErr.message);
  }
  return fresh;
}

/** Upsert the admin config row. No-op when Supabase is not configured. */
export async function saveAdminConfig(cfg: AdminConfig): Promise<void> {
  const sb = getAdminSupabase();
  if (!sb) return;
  const { error } = await sb
    .from("admin_config")
    .upsert({ key: CONFIG_KEY, value: cfg });
  if (error) {
    console.error("[configStore] write failed:", error.message);
  }
}

/** Convenience id generator, scoped to this module. */
export function newId(prefix: string): string {
  const n = Math.floor(100000 + Math.random() * 899999);
  return `${prefix}_${n}`;
}
