import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { getPlaylistItems, setPlaylistItems } from "@/lib/server/mediaStore";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

/** Replace the ordered item list: body { mediaIds: string[] } (order = playback order). */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: { mediaIds?: string[] };
  try {
    body = (await req.json()) as { mediaIds?: string[] };
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!Array.isArray(body.mediaIds)) return jsonError("invalid_request", "mediaIds array is required");
  const { id } = await params;
  const ok = await setPlaylistItems(id, body.mediaIds);
  if (!ok) return jsonError("db_error", "Failed to update playlist items", 500);
  await logAudit(auth.admin.email, "playlist-updated", `Set ${body.mediaIds.length} items on playlist ${id}`, id);
  return jsonOk(await getPlaylistItems(id));
}
