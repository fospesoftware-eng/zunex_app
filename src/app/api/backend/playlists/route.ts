import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { createPlaylist, listPlaylists } from "@/lib/server/mediaStore";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  return jsonOk(await listPlaylists());
}

interface CreateBody {
  name?: string;
  description?: string;
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
  if (!body.name?.trim()) return jsonError("invalid_request", "name is required");
  const pl = await createPlaylist({
    name: body.name.trim(),
    description: body.description?.trim() ?? "",
    active: body.active ?? true,
  });
  if (!pl) return jsonError("db_error", "Failed to create playlist", 500);
  await logAudit(auth.admin.email, "playlist-created", `Created playlist "${pl.name}"`, pl.id);
  return jsonOk(pl, { status: 201 });
}
