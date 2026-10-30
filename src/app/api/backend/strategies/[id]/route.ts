import { getAdminConfig, saveAdminConfig } from "@/lib/server/configStore";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  let patch: { enabled?: boolean; timeSlot?: string; deviceRatioPct?: number };
  try {
    patch = (await req.json()) as typeof patch;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const { id } = await params;
  const cfg = await getAdminConfig();
  const idx = cfg.strategies.findIndex((s) => s.id === id);
  if (idx < 0) return jsonError("strategy_not_found", undefined, 404);
  cfg.strategies[idx] = { ...cfg.strategies[idx], ...patch };
  await saveAdminConfig(cfg);
  await logAudit(auth.admin.email, "strategy-updated", `Updated strategy ${cfg.strategies[idx].timeSlot}`, id);
  return jsonOk(cfg.strategies[idx]);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const cfg = await getAdminConfig();
  const len = cfg.strategies.length;
  cfg.strategies = cfg.strategies.filter((s) => s.id !== id);
  if (cfg.strategies.length === len) return jsonError("strategy_not_found", undefined, 404);
  await saveAdminConfig(cfg);
  await logAudit(auth.admin.email, "strategy-deleted", `Deleted strategy ${id}`, id);
  return jsonOk({ deleted: true });
}
