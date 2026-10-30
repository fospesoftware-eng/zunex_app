import { getAdminConfig, saveAdminConfig } from "@/lib/server/configStore";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  return jsonOk(await getAdminConfig());
}

export async function PUT(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const body = (await req.json()) as Parameters<typeof saveAdminConfig>[0];
    if (!body || typeof body !== "object") return jsonError("invalid_request");
    await saveAdminConfig(body);
    await logAudit(auth.admin.email, "config-change", "Updated admin configuration");
    return jsonOk(await getAdminConfig());
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
}
