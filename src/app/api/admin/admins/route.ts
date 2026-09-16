import { adminConfig, newId, saveAdminConfig } from "@/lib/server/configStore";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/admin/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  return jsonOk(adminConfig().admins);
}

interface CreateAdmin {
  name?: string;
  email?: string;
  role?: "super_admin" | "admin" | "viewer";
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: CreateAdmin;
  try {
    body = (await req.json()) as CreateAdmin;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!body.name || !body.email) return jsonError("invalid_request", "name and email are required");
  const cfg = adminConfig();
  const user = {
    id: newId("adm"),
    name: body.name,
    email: body.email,
    role: body.role ?? "viewer",
    active: true,
    lastLoginAt: null,
  };
  cfg.admins.push(user);
  saveAdminConfig(cfg);
  return jsonOk(user, { status: 201 });
}
