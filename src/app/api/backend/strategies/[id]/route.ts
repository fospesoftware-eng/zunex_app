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
  let patch: { enabled?: boolean; timeSlot?: string; deviceRatioPct?: number };
  try {
    patch = (await req.json()) as typeof patch;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const { id } = await params;
  const cfg = adminConfig();
  const idx = cfg.strategies.findIndex((s) => s.id === id);
  if (idx < 0) return jsonError("strategy_not_found", undefined, 404);
  cfg.strategies[idx] = { ...cfg.strategies[idx], ...patch };
  saveAdminConfig(cfg);
  return jsonOk(cfg.strategies[idx]);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const cfg = adminConfig();
  const len = cfg.strategies.length;
  cfg.strategies = cfg.strategies.filter((s) => s.id !== id);
  if (cfg.strategies.length === len) return jsonError("strategy_not_found", undefined, 404);
  saveAdminConfig(cfg);
  return jsonOk({ deleted: true });
}
