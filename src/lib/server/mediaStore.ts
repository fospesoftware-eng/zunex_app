// ---------------------------------------------------------------------------
// Media/ad workflow store — Supabase-backed.
// Powers the Zunex Plus inbuilt video player: media assets (video ads),
// playlists, per-device assignment, and proof-of-play logging.
// ---------------------------------------------------------------------------

import { getAdminSupabase } from "@/lib/server/supabase";

export interface MediaAsset {
  id: string;
  name: string;
  description: string;
  videoUrl: string;
  posterUrl: string;
  durationSec: number;
  sizeBytes: number | null;
  mime: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  active: boolean;
  itemCount: number;
  assignedDevices: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PlaylistItem {
  mediaId: string;
  position: number;
  asset?: MediaAsset;
}

export interface DeviceAssignment {
  deviceId: string;
  playlistId: string;
  assignedAt: string | null;
}

export interface PlaybackLog {
  id: number;
  deviceId: string;
  playlistId: string | null;
  mediaId: string | null;
  event: string;
  playedAt: string | null;
}

export interface MediaServerConfig {
  baseUrl: string;
  apiKey: string;
}

// ── row mappers ──────────────────────────────────────────────────────────
function rowToAsset(r: Record<string, unknown>): MediaAsset {
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    description: String(r.description ?? ""),
    videoUrl: String(r.video_url ?? ""),
    posterUrl: String(r.poster_url ?? ""),
    durationSec: Number(r.duration_sec ?? 15),
    sizeBytes: r.size_bytes != null ? Number(r.size_bytes) : null,
    mime: String(r.mime ?? "video/mp4"),
    active: Boolean(r.active ?? true),
    createdAt: (r.created_at as string) ?? null,
    updatedAt: (r.updated_at as string) ?? null,
  };
}

// ── Media assets ─────────────────────────────────────────────────────────
export async function listMediaAssets(): Promise<MediaAsset[]> {
  const sb = getAdminSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("media_assets").select("*").order("created_at", { ascending: false });
  if (error) { console.error("[media] list assets:", error); return []; }
  return (data ?? []).map(rowToAsset);
}

export async function createMediaAsset(input: {
  name: string; description?: string; videoUrl: string; posterUrl?: string;
  durationSec?: number; sizeBytes?: number | null; mime?: string; active?: boolean;
}): Promise<MediaAsset | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const id = `ma_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  const { data, error } = await sb.from("media_assets").insert({
    id,
    name: input.name,
    description: input.description ?? "",
    video_url: input.videoUrl,
    poster_url: input.posterUrl ?? "",
    duration_sec: input.durationSec ?? 15,
    size_bytes: input.sizeBytes ?? null,
    mime: input.mime ?? "video/mp4",
    active: input.active ?? true,
  }).select().single();
  if (error) { console.error("[media] create asset:", error); return null; }
  return rowToAsset(data);
}

export async function updateMediaAsset(
  id: string,
  patch: Partial<Omit<MediaAsset, "id" | "createdAt" | "updatedAt">>,
): Promise<MediaAsset | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const u: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) u.name = patch.name;
  if (patch.description !== undefined) u.description = patch.description;
  if (patch.videoUrl !== undefined) u.video_url = patch.videoUrl;
  if (patch.posterUrl !== undefined) u.poster_url = patch.posterUrl;
  if (patch.durationSec !== undefined) u.duration_sec = patch.durationSec;
  if (patch.sizeBytes !== undefined) u.size_bytes = patch.sizeBytes;
  if (patch.mime !== undefined) u.mime = patch.mime;
  if (patch.active !== undefined) u.active = patch.active;
  const { data, error } = await sb.from("media_assets").update(u).eq("id", id).select().single();
  if (error) { console.error("[media] update asset:", error); return null; }
  return rowToAsset(data);
}

export async function deleteMediaAsset(id: string): Promise<boolean> {
  const sb = getAdminSupabase();
  if (!sb) return false;
  const { error } = await sb.from("media_assets").delete().eq("id", id);
  if (error) { console.error("[media] delete asset:", error); return false; }
  return true;
}

// ── Playlists ────────────────────────────────────────────────────────────
export async function listPlaylists(): Promise<Playlist[]> {
  const sb = getAdminSupabase();
  if (!sb) return [];
  const [plRes, itemRes, assignRes] = await Promise.all([
    sb.from("playlists").select("*").order("created_at", { ascending: false }),
    sb.from("playlist_items").select("playlist_id"),
    sb.from("device_playlists").select("playlist_id"),
  ]);
  if (plRes.error) { console.error("[media] list playlists:", plRes.error); return []; }
  const itemCounts = new Map<string, number>();
  for (const r of itemRes.data ?? []) itemCounts.set(r.playlist_id, (itemCounts.get(r.playlist_id) ?? 0) + 1);
  const assignCounts = new Map<string, number>();
  for (const r of assignRes.data ?? []) assignCounts.set(r.playlist_id, (assignCounts.get(r.playlist_id) ?? 0) + 1);
  return (plRes.data ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
    description: String(r.description ?? ""),
    active: Boolean(r.active ?? true),
    itemCount: itemCounts.get(String(r.id)) ?? 0,
    assignedDevices: assignCounts.get(String(r.id)) ?? 0,
    createdAt: (r.created_at as string) ?? null,
    updatedAt: (r.updated_at as string) ?? null,
  }));
}

export async function getPlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
  const sb = getAdminSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("playlist_items")
    .select("media_id, position")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });
  if (error) { console.error("[media] playlist items:", error); return []; }
  const items = (data ?? []).map((r) => ({ mediaId: String(r.media_id), position: Number(r.position) }));
  if (items.length === 0) return items;
  const { data: assets } = await sb.from("media_assets").select("*").in("id", items.map((i) => i.mediaId));
  const byId = new Map((assets ?? []).map((a) => [String(a.id), rowToAsset(a)]));
  return items.map((i) => ({ ...i, asset: byId.get(i.mediaId) }));
}

export async function createPlaylist(input: { name: string; description?: string; active?: boolean }): Promise<Playlist | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  const id = `pl_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
  const { error } = await sb.from("playlists").insert({
    id, name: input.name, description: input.description ?? "", active: input.active ?? true,
  });
  if (error) { console.error("[media] create playlist:", error); return null; }
  return {
    id, name: input.name, description: input.description ?? "", active: input.active ?? true,
    itemCount: 0, assignedDevices: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

export async function updatePlaylist(
  id: string,
  patch: { name?: string; description?: string; active?: boolean },
): Promise<boolean> {
  const sb = getAdminSupabase();
  if (!sb) return false;
  const u: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) u.name = patch.name;
  if (patch.description !== undefined) u.description = patch.description;
  if (patch.active !== undefined) u.active = patch.active;
  const { error } = await sb.from("playlists").update(u).eq("id", id);
  if (error) { console.error("[media] update playlist:", error); return false; }
  return true;
}

export async function deletePlaylist(id: string): Promise<boolean> {
  const sb = getAdminSupabase();
  if (!sb) return false;
  const { error } = await sb.from("playlists").delete().eq("id", id);
  if (error) { console.error("[media] delete playlist:", error); return false; }
  return true;
}

/** Replace the ordered item list of a playlist (positions 0..n). */
export async function setPlaylistItems(playlistId: string, mediaIds: string[]): Promise<boolean> {
  const sb = getAdminSupabase();
  if (!sb) return false;
  const { error: delErr } = await sb.from("playlist_items").delete().eq("playlist_id", playlistId);
  if (delErr) { console.error("[media] clear items:", delErr); return false; }
  if (mediaIds.length === 0) return true;
  const rows = mediaIds.map((mediaId, i) => ({ playlist_id: playlistId, media_id: mediaId, position: i }));
  const { error } = await sb.from("playlist_items").insert(rows);
  if (error) { console.error("[media] set items:", error); return false; }
  return true;
}

// ── Device assignment ────────────────────────────────────────────────────
export async function listAssignments(): Promise<DeviceAssignment[]> {
  const sb = getAdminSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from("device_playlists").select("*");
  if (error) { console.error("[media] assignments:", error); return []; }
  return (data ?? []).map((r) => ({
    deviceId: String(r.device_id),
    playlistId: String(r.playlist_id),
    assignedAt: (r.assigned_at as string) ?? null,
  }));
}

/** Assign (or clear with null) the playlist for a Zunex Plus device. */
export async function assignPlaylistToDevice(deviceId: string, playlistId: string | null): Promise<boolean> {
  const sb = getAdminSupabase();
  if (!sb) return false;
  if (playlistId === null) {
    const { error } = await sb.from("device_playlists").delete().eq("device_id", deviceId);
    if (error) { console.error("[media] unassign:", error); return false; }
    return true;
  }
  const { error } = await sb.from("device_playlists").upsert({
    device_id: deviceId, playlist_id: playlistId, assigned_at: new Date().toISOString(),
  });
  if (error) { console.error("[media] assign:", error); return false; }
  return true;
}

// ── Media server config (admin_config key "media_server") ────────────────
export async function getMediaServerConfig(): Promise<MediaServerConfig> {
  const sb = getAdminSupabase();
  const fallback: MediaServerConfig = { baseUrl: "https://media.zunexglobal.com/ads", apiKey: "" };
  if (!sb) return fallback;
  const { data, error } = await sb.from("admin_config").select("value").eq("key", "media_server").single();
  if (error || !data) return fallback;
  const v = data.value as Record<string, unknown>;
  return {
    baseUrl: String(v.baseUrl ?? fallback.baseUrl).replace(/\/+$/, ""),
    apiKey: String(v.apiKey ?? ""),
  };
}

export async function saveMediaServerConfig(cfg: MediaServerConfig): Promise<boolean> {
  const sb = getAdminSupabase();
  if (!sb) return false;
  const { error } = await sb.from("admin_config").upsert({
    key: "media_server",
    value: { baseUrl: cfg.baseUrl.replace(/\/+$/, ""), apiKey: cfg.apiKey },
    updated_at: new Date().toISOString(),
  });
  if (error) { console.error("[media] save server config:", error); return false; }
  return true;
}

/** Resolve a media reference to an absolute URL using the media server base. */
export function resolveMediaUrl(ref: string, baseUrl: string): string {
  if (/^https?:\/\//i.test(ref)) return ref;
  return `${baseUrl}/${ref.replace(/^\/+/, "")}`;
}

// ── Device-facing playback resolution ────────────────────────────────────
export interface DevicePlayback {
  deviceId: string;
  playlistId: string | null;
  playlistName: string | null;
  mediaServer: string;
  items: { mediaId: string; name: string; url: string; posterUrl: string; durationSec: number; mime: string }[];
}

export async function getDevicePlayback(deviceId: string): Promise<DevicePlayback | null> {
  const sb = getAdminSupabase();
  if (!sb) return null;
  // Device must exist
  const { data: hw, error: hwErr } = await sb
    .from("hardware")
    .select("id, device_type")
    .eq("id", deviceId)
    .single();
  if (hwErr || !hw) return null;
  const cfg = await getMediaServerConfig();
  const { data: assign } = await sb
    .from("device_playlists")
    .select("playlist_id")
    .eq("device_id", deviceId)
    .maybeSingle();
  if (!assign) {
    return { deviceId, playlistId: null, playlistName: null, mediaServer: cfg.baseUrl, items: [] };
  }
  const { data: pl } = await sb.from("playlists").select("id, name, active").eq("id", assign.playlist_id).single();
  if (!pl || !pl.active) {
    return { deviceId, playlistId: null, playlistName: null, mediaServer: cfg.baseUrl, items: [] };
  }
  const items = await getPlaylistItems(pl.id);
  return {
    deviceId,
    playlistId: pl.id,
    playlistName: String(pl.name),
    mediaServer: cfg.baseUrl,
    items: items
      .filter((i) => i.asset && i.asset.active)
      .map((i) => ({
        mediaId: i.mediaId,
        name: i.asset!.name,
        url: resolveMediaUrl(i.asset!.videoUrl, cfg.baseUrl),
        posterUrl: i.asset!.posterUrl ? resolveMediaUrl(i.asset!.posterUrl, cfg.baseUrl) : "",
        durationSec: i.asset!.durationSec,
        mime: i.asset!.mime,
      })),
  };
}

// ── Proof-of-play ────────────────────────────────────────────────────────
export async function logPlayback(input: {
  deviceId: string; playlistId?: string | null; mediaId?: string | null; event: string;
}): Promise<boolean> {
  const sb = getAdminSupabase();
  if (!sb) return false;
  const { error } = await sb.from("playback_logs").insert({
    device_id: input.deviceId,
    playlist_id: input.playlistId ?? null,
    media_id: input.mediaId ?? null,
    event: input.event,
  });
  if (error) { console.error("[media] playback log:", error); return false; }
  return true;
}

export async function listPlaybackLogs(opts: { deviceId?: string; limit?: number } = {}): Promise<PlaybackLog[]> {
  const sb = getAdminSupabase();
  if (!sb) return [];
  let q = sb.from("playback_logs").select("*").order("played_at", { ascending: false }).limit(opts.limit ?? 100);
  if (opts.deviceId) q = q.eq("device_id", opts.deviceId);
  const { data, error } = await q;
  if (error) { console.error("[media] playback list:", error); return []; }
  return (data ?? []).map((r) => ({
    id: Number(r.id),
    deviceId: String(r.device_id),
    playlistId: r.playlist_id ? String(r.playlist_id) : null,
    mediaId: r.media_id ? String(r.media_id) : null,
    event: String(r.event ?? "start"),
    playedAt: (r.played_at as string) ?? null,
  }));
}
