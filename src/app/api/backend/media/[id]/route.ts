import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { deleteMediaAsset, updateMediaAsset } from "@/lib/server/mediaStore";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const { id } = await params;
  const updated = await updateMediaAsset(id, {
    name: body.name !== undefined ? String(body.name) : undefined,
    description: body.description !== undefined ? String(body.description) : undefined,
    videoUrl: body.videoUrl !== undefined ? String(body.videoUrl) : undefined,
    posterUrl: body.posterUrl !== undefined ? String(body.posterUrl) : undefined,
    durationSec: body.durationSec !== undefined ? Number(body.durationSec) : undefined,
    sizeBytes: body.sizeBytes !== undefined ? (body.sizeBytes === null ? null : Number(body.sizeBytes)) : undefined,
    mime: body.mime !== undefined ? String(body.mime) : undefined,
    active: body.active !== undefined ? Boolean(body.active) : undefined,
  });
  if (!updated) return jsonError("not_found", "Media asset not found", 404);
  return jsonOk(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = await deleteMediaAsset(id);
  if (!ok) return jsonError("not_found", "Media asset not found", 404);
  await logAudit(auth.admin.email, "media-deleted", `Deleted media asset ${id}`, id);
  return jsonOk({ deleted: true });
}
