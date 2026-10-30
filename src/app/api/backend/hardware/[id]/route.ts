import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { deleteHardware, getHardware, updateHardware } from "@/lib/server/hardwareStore";
import { logAudit } from "@/lib/server/audit";

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
  if (patch.deviceType && !["zunex_one", "zunex_plus"].includes(patch.deviceType as string)) {
    return jsonError("invalid_request", "deviceType must be zunex_one or zunex_plus");
  }
  const updated = await updateHardware(id, patch);
  if (!updated) return jsonError("hardware_not_found", undefined, 404);
  await logAudit(auth.admin.email, "hardware-updated", `Updated device ${updated.deviceId}`, updated.id);
  return jsonOk(updated);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const existing = await getHardware(id);
  const ok = await deleteHardware(id);
  if (!ok) return jsonError("hardware_not_found", undefined, 404);
  await logAudit(auth.admin.email, "hardware-deleted", `Deleted device ${existing?.deviceId ?? id}`, id);
  return jsonOk({ deleted: true });
}
