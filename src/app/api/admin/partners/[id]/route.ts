import { adminConfig, saveAdminConfig } from "@/lib/server/configStore";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/admin/_auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const p = adminConfig().partners.find((x) => x.id === id);
  if (!p) return jsonError("partner_not_found", undefined, 404);
  return jsonOk(p);
}

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
  const idx = cfg.partners.findIndex((p) => p.id === id);
  if (idx < 0) return jsonError("partner_not_found", undefined, 404);
  cfg.partners[idx] = { ...cfg.partners[idx], ...patch };
  saveAdminConfig(cfg);
  return jsonOk(cfg.partners[idx]);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const cfg = adminConfig();
  const len = cfg.partners.length;
  cfg.partners = cfg.partners.filter((p) => p.id !== id);
  if (cfg.partners.length === len) return jsonError("partner_not_found", undefined, 404);
  saveAdminConfig(cfg);
  return jsonOk({ deleted: true });
}
