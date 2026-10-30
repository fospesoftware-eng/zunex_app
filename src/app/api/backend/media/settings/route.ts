import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { getMediaServerConfig, saveMediaServerConfig } from "@/lib/server/mediaStore";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  return jsonOk(await getMediaServerConfig());
}

export async function PUT(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: { baseUrl?: string; apiKey?: string };
  try {
    body = (await req.json()) as { baseUrl?: string; apiKey?: string };
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!body.baseUrl?.trim()) return jsonError("invalid_request", "baseUrl is required");
  const ok = await saveMediaServerConfig({
    baseUrl: body.baseUrl.trim(),
    apiKey: body.apiKey?.trim() ?? "",
  });
  if (!ok) return jsonError("db_error", "Failed to save media server config", 500);
  await logAudit(auth.admin.email, "config-change", `Media server set to ${body.baseUrl.trim()}`, "media_server");
  return jsonOk(await getMediaServerConfig());
}
