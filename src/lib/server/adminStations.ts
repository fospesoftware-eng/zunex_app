// Admin station override layer — now backed by Supabase.
// All CRUD operations write directly to public.stations via service-role client.

import { getAdminSupabase } from "@/lib/server/supabase";
import type { DeviceModel, InstallType } from "@/lib/core/types";

export interface AdminStation {
  id: string;
  name: string;
  location: string;
  powerWatts: number;
  connector: string;
  baseStatus: "available" | "maintenance" | "offline";
  forceStatus: "available" | "offline" | "busy" | null;
  createdAt: number;
  deviceModel: DeviceModel;
  installType: InstallType;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

// ── Supabase row → AdminStation ──────────────────────────────────────────
function rowToStation(row: Record<string, unknown>): AdminStation {
  return {
    id: String(row.id),
    name: String(row.name),
    location: String(row.location ?? ""),
    powerWatts: Number(row.power_watts ?? 45),
    connector: String(row.connector ?? "USB-C"),
    baseStatus: (row.base_status as AdminStation["baseStatus"]) ?? "available",
    forceStatus: (row.force_status as AdminStation["forceStatus"]) ?? null,
    createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : Date.now(),
    deviceModel: (row.device_model as DeviceModel) ?? "core",
    installType: (row.install_type as InstallType) ?? "office",
    city: String(row.city ?? ""),
    state: String(row.state ?? ""),
    lat: Number(row.lat ?? 0),
    lng: Number(row.lng ?? 0),
  };
}

export async function getAllAdminStations(): Promise<AdminStation[]> {
  const sb = getAdminSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("stations").select("*").order("id");
  if (error) {
    console.error("[adminStations] list error:", error);
    return [];
  }
  return (data ?? []).map(rowToStation);
}

export async function getAdminStation(id: string): Promise<AdminStation | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from("stations").select("*").eq("id", id.toUpperCase()).single();
  if (error || !data) return null;
  return rowToStation(data);
}

export async function createAdminStation(
  data: Omit<AdminStation, "createdAt" | "forceStatus">,
): Promise<AdminStation | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const { data: row, error } = await sb.from("stations").insert({
    id: data.id.toUpperCase(),
    name: data.name,
    location: data.location,
    power_watts: data.powerWatts,
    connector: data.connector,
    base_status: data.baseStatus,
    device_model: data.deviceModel,
    install_type: data.installType,
    city: data.city,
    state: data.state,
    lat: data.lat,
    lng: data.lng,
  }).select().single();
  if (error) {
    console.error("[adminStations] create error:", error);
    return null;
  }
  return rowToStation(row);
}

export async function updateAdminStation(
  id: string,
  patch: Partial<Omit<AdminStation, "id" | "createdAt">>,
): Promise<AdminStation | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.location !== undefined) update.location = patch.location;
  if (patch.powerWatts !== undefined) update.power_watts = patch.powerWatts;
  if (patch.connector !== undefined) update.connector = patch.connector;
  if (patch.baseStatus !== undefined) update.base_status = patch.baseStatus;
  if (patch.forceStatus !== undefined) update.force_status = patch.forceStatus;
  if (patch.deviceModel !== undefined) update.device_model = patch.deviceModel;
  if (patch.installType !== undefined) update.install_type = patch.installType;
  if (patch.city !== undefined) update.city = patch.city;
  if (patch.state !== undefined) update.state = patch.state;
  if (patch.lat !== undefined) update.lat = patch.lat;
  if (patch.lng !== undefined) update.lng = patch.lng;
  update.updated_at = new Date().toISOString();

  const { data: row, error } = await sb
    .from("stations")
    .update(update)
    .eq("id", id.toUpperCase())
    .select()
    .single();
  if (error) {
    console.error("[adminStations] update error:", error);
    return null;
  }
  return rowToStation(row);
}

export async function deleteAdminStation(id: string): Promise<boolean> {
  const sb = getAdminSupabase();
  if (!sb) return false;
  const { error } = await sb.from("stations").delete().eq("id", id.toUpperCase());
  if (error) {
    console.error("[adminStations] delete error:", error);
    return false;
  }
  return true;
}

/**
 * Compute live visible status. Uses forceStatus if set, otherwise baseStatus.
 * "busy" detection requires session data — left to the caller for now.
 */
export function computeAdminStationStatus(s: AdminStation): "available" | "busy" | "offline" {
  if (s.forceStatus) return s.forceStatus;
  if (s.baseStatus === "offline") return "offline";
  return "available";
}

/** Count of sessions created today (UTC midnight). */
export async function sessionsCreatedToday(): Promise<number> {
  const sb = getAdminSupabase();
  if (!sb) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count, error } = await sb
    .from("sessions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString());
  if (error) return 0;
  return count ?? 0;
}

/** Sum of revenue from sessions paid today (in paise). */
export async function revenueTodayPaise(): Promise<number> {
  const sb = getAdminSupabase();
  if (!sb) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data, error } = await sb
    .from("sessions")
    .select("plan_id")
    .gte("created_at", today.toISOString())
    .eq("state", "completed");
  if (error || !data) return 0;
  // TODO: join with plans table for real pricing
  return data.length * 0;
}
