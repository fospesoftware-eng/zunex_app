import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { getAdminSupabase } from "@/lib/server/supabase";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

const SELECT_COLS = "id,name,key_prefix,permissions,last_used_at,revoked,created_at";
const ALLOWED_PERMS = new Set(["read", "write", "admin"]);

interface PatchBody {
  name?: string;
  permissions?: string[];
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const sb = getAdminSupabase();
  if (!sb) return jsonError("misconfigured", "Supabase admin client not configured", 500);
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const { id } = await params;
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (Array.isArray(body.permissions)) {
    patch.permissions = body.permissions.filter((p) => ALLOWED_PERMS.has(p));
  }
  if (Object.keys(patch).length === 0) return jsonError("invalid_request", "Nothing to update");
  const { data, error } = await sb
    .from("api_keys")
    .update(patch)
    .eq("id", id)
    .select(SELECT_COLS)
    .single();
  if (error) return jsonError("db_error", error.message, 500);
  if (!data) return jsonError("not_found", "API key not found", 404);
  return jsonOk(data);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const sb = getAdminSupabase();
  if (!sb) return jsonError("misconfigured", "Supabase admin client not configured", 500);
  const { id } = await params;
  // Soft delete — revoked keys stay for audit purposes.
  const { data, error } = await sb
    .from("api_keys")
    .update({ revoked: true })
    .eq("id", id)
    .select(SELECT_COLS)
    .single();
  if (error) return jsonError("db_error", error.message, 500);
  if (!data) return jsonError("not_found", "API key not found", 404);
  await logAudit(auth.admin.email, "apikey-revoked", `Revoked API key "${data.name}"`, id);
  return jsonOk(data);
}
