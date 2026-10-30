import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { createMediaAsset, listMediaAssets } from "@/lib/server/mediaStore";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  return jsonOk(await listMediaAssets());
}

interface CreateBody {
  name?: string;
  description?: string;
  videoUrl?: string;
  posterUrl?: string;
  durationSec?: number;
  sizeBytes?: number | null;
  mime?: string;
  active?: boolean;
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!body.name?.trim() || !body.videoUrl?.trim()) {
    return jsonError("invalid_request", "name and videoUrl are required");
  }
  const asset = await createMediaAsset({
    name: body.name.trim(),
    description: body.description?.trim() ?? "",
    videoUrl: body.videoUrl.trim(),
    posterUrl: body.posterUrl?.trim() ?? "",
    durationSec: Math.max(1, Number(body.durationSec ?? 15)),
    sizeBytes: body.sizeBytes ?? null,
    mime: body.mime ?? "video/mp4",
    active: body.active ?? true,
  });
  if (!asset) return jsonError("db_error", "Failed to create media asset", 500);
  await logAudit(auth.admin.email, "media-created", `Added media asset "${asset.name}"`, asset.id);
  return jsonOk(asset, { status: 201 });
}
