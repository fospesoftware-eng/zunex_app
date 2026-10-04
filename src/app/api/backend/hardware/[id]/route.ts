import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { deleteHardware, getHardware, updateHardware } from "@/lib/server/hardwareStore";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const h = await getHardware(id);
  if (!h) return jsonError("hardware_not_found", undefined, 404);
  return jsonOk(h);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  let patch: Record<string, unknown>;
  try {
    patch = (await req.json()) as typeof patch;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const { id } = await params;
  const updated = await updateHardware(id, patch);
  if (!updated) return jsonError("hardware_not_found", undefined, 404);
  return jsonOk(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = await deleteHardware(id);
  if (!ok) return jsonError("hardware_not_found", undefined, 404);
  return jsonOk({ deleted: true });
}
