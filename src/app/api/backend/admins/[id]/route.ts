import { adminConfig, saveAdminConfig } from "@/lib/server/configStore";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  let patch: Record<string, unknown>;
  try {
    patch = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const { id } = await params;
  const cfg = adminConfig();
  const idx = cfg.admins.findIndex((a) => a.id === id);
  if (idx < 0) return jsonError("admin_not_found", undefined, 404);
  cfg.admins[idx] = { ...cfg.admins[idx], ...patch };
  saveAdminConfig(cfg);
  return jsonOk(cfg.admins[idx]);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const cfg = adminConfig();
  const target = cfg.admins.find((a) => a.id === id);
  if (!target) return jsonError("admin_not_found", undefined, 404);
  if (target.role === "super_admin")
    return jsonError("invalid_request", "Cannot delete the super admin", 400);
  cfg.admins = cfg.admins.filter((a) => a.id !== id);
  saveAdminConfig(cfg);
  return jsonOk({ deleted: true });
}
