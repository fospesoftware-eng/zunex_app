import { jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/app/api/backend/_auth";
import { getAdminSupabase } from "@/lib/server/supabase";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

const ROLES = ["super_admin", "admin", "operator", "support"] as const;
type Role = (typeof ROLES)[number];

interface PatchAdmin {
  name?: string;
  role?: Role;
  active?: boolean;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(req, "admin");
  if (!auth.ok) return auth.response;
  const sb = getAdminSupabase();
  if (!sb) return jsonError("misconfigured", "Supabase admin client not configured", 500);
  let patch: PatchAdmin;
  try {
    patch = (await req.json()) as PatchAdmin;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (patch.role !== undefined && !ROLES.includes(patch.role))
    return jsonError("invalid_request", `role must be one of: ${ROLES.join(", ")}`);
  const { id } = await params;

  const updates: Record<string, unknown> = {};
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.role !== undefined) updates.role = patch.role;
  if (patch.active !== undefined) updates.active = patch.active;

  const { data, error } = await sb
    .from("admins")
    .update(updates)
    .eq("id", id)
    .select("id, email, name, role, active, last_login, created_at")
    .single();
  if (error) return jsonError("admin_not_found", error.message, 404);

  // Ban/unban the auth user to match the active flag.
  if (patch.active === false) {
    await sb.auth.admin.updateUserById(id, { ban_duration: "876000h" });
  } else if (patch.active === true) {
    await sb.auth.admin.updateUserById(id, { ban_duration: "none" });
  }

  await logAudit(auth.admin.email, "user-updated", `Updated admin ${data.email}`, id);
  return jsonOk(data);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole(req, "admin");
  if (!auth.ok) return auth.response;
  const sb = getAdminSupabase();
  if (!sb) return jsonError("misconfigured", "Supabase admin client not configured", 500);
  const { id } = await params;

  if (auth.admin.userId === id)
    return jsonError("invalid_request", "Cannot delete your own account", 400);

  const { error } = await sb.from("admins").delete().eq("id", id);
  if (error) return jsonError("internal_error", error.message, 500);
  await sb.auth.admin.deleteUser(id);

  await logAudit(auth.admin.email, "user-updated", `Deleted admin ${id}`, id);
  return jsonOk({ deleted: true });
}
