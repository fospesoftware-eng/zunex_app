import { getAdminConfig, saveAdminConfig } from "@/lib/server/configStore";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const cfg = await getAdminConfig();
  const p = cfg.partners.find((x) => x.id === id);
  if (!p) return jsonError("partner_not_found", undefined, 404);
  return jsonOk(p);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  let patch: Record<string, unknown>;
  try {
    patch = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const { id } = await params;
  const cfg = await getAdminConfig();
  const idx = cfg.partners.findIndex((p) => p.id === id);
  if (idx < 0) return jsonError("partner_not_found", undefined, 404);
  cfg.partners[idx] = { ...cfg.partners[idx], ...patch };
  await saveAdminConfig(cfg);
  await logAudit(auth.admin.email, "partner-updated", `Updated partner ${cfg.partners[idx].name}`, id);
  return jsonOk(cfg.partners[idx]);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const cfg = await getAdminConfig();
  const target = cfg.partners.find((p) => p.id === id);
  if (!target) return jsonError("partner_not_found", undefined, 404);
  cfg.partners = cfg.partners.filter((p) => p.id !== id);
  await saveAdminConfig(cfg);
  await logAudit(auth.admin.email, "partner-deleted", `Deleted partner ${target.name}`, id);
  return jsonOk({ deleted: true });
}
