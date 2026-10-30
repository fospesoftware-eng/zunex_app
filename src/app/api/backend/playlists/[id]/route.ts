import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { deletePlaylist, getPlaylistItems, listAssignments, listPlaylists, updatePlaylist } from "@/lib/server/mediaStore";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const [playlists, items, assignments] = await Promise.all([
    listPlaylists(),
    getPlaylistItems(id),
    listAssignments(),
  ]);
  const pl = playlists.find((p) => p.id === id);
  if (!pl) return jsonError("not_found", "Playlist not found", 404);
  return jsonOk({
    ...pl,
    items,
    devices: assignments.filter((a) => a.playlistId === id).map((a) => a.deviceId),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: { name?: string; description?: string; active?: boolean };
  try {
    body = (await req.json()) as { name?: string; description?: string; active?: boolean };
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const { id } = await params;
  const ok = await updatePlaylist(id, body);
  if (!ok) return jsonError("not_found", "Playlist not found", 404);
  await logAudit(auth.admin.email, "playlist-updated", `Updated playlist ${id}`, id);
  return jsonOk({ updated: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = await deletePlaylist(id);
  if (!ok) return jsonError("not_found", "Playlist not found", 404);
  await logAudit(auth.admin.email, "playlist-updated", `Deleted playlist ${id}`, id);
  return jsonOk({ deleted: true });
}
