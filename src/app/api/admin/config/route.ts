import { adminConfig, saveAdminConfig } from "@/lib/server/configStore";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/admin/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  return jsonOk(adminConfig());
}

export async function PUT(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  try {
    const body = (await req.json()) as Parameters<typeof saveAdminConfig>[0];
    if (!body || typeof body !== "object") return jsonError("invalid_request");
    saveAdminConfig(body);
    return jsonOk(adminConfig());
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
}
