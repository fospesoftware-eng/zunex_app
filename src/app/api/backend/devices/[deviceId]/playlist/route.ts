import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { getAdminSupabase } from "@/lib/server/supabase";
import { assignPlaylistToDevice, getDevicePlayback } from "@/lib/server/mediaStore";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

/** Admin: get a device's current playlist assignment + resolved playback items. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { deviceId } = await params;
  const playback = await getDevicePlayback(deviceId);
  if (!playback) return jsonError("not_found", "Device not found", 404);
  return jsonOk(playback);
}

/** Admin: assign a playlist to a Zunex Plus device (or clear with { playlistId: null }). */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ deviceId: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: { playlistId?: string | null };
  try {
    body = (await req.json()) as { playlistId?: string | null };
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const { deviceId } = await params;

  // Device must exist and be a Zunex Plus
  const sb = getAdminSupabase();
  if (!sb) return jsonError("misconfigured", "Supabase admin client not configured", 500);
  const { data: hw, error: hwErr } = await sb
    .from("hardware")
    .select("id, device_id, device_type")
    .eq("id", deviceId)
    .single();
  if (hwErr || !hw) return jsonError("not_found", "Device not found", 404);
  if (hw.device_type !== "zunex_plus") {
    return jsonError("invalid_request", "Playlists can only be assigned to Zunex Plus devices (inbuilt video player)");
  }

  const ok = await assignPlaylistToDevice(deviceId, body.playlistId ?? null);
  if (!ok) return jsonError("db_error", "Failed to assign playlist", 500);
  await logAudit(
    auth.admin.email,
    "playlist-assigned",
    body.playlistId
      ? `Assigned playlist ${body.playlistId} to device ${hw.device_id}`
      : `Cleared playlist from device ${hw.device_id}`,
    deviceId,
  );
  return jsonOk(await getDevicePlayback(deviceId));
}
