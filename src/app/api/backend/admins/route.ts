import { jsonError, jsonOk } from "@/lib/server/http";
import { requireRole } from "@/app/api/backend/_auth";
import { getAdminSupabase } from "@/lib/server/supabase";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

const ROLES = ["super_admin", "admin", "operator", "support"] as const;
type Role = (typeof ROLES)[number];

export async function GET(req: Request) {
  const auth = await requireRole(req, "admin");
  if (!auth.ok) return auth.response;
  const sb = getAdminSupabase();
  if (!sb) return jsonError("misconfigured", "Supabase admin client not configured", 500);
  const { data, error } = await sb
    .from("admins")
    .select("id, email, name, role, active, last_login, created_at")
    .order("created_at", { ascending: true });
  if (error) return jsonError("internal_error", error.message, 500);
  return jsonOk(data ?? []);
}

interface CreateAdmin {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
}

export async function POST(req: Request) {
  const auth = await requireRole(req, "admin");
  if (!auth.ok) return auth.response;
  const sb = getAdminSupabase();
  if (!sb) return jsonError("misconfigured", "Supabase admin client not configured", 500);
  let body: CreateAdmin;
  try {
    body = (await req.json()) as CreateAdmin;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!body.name || !body.email || !body.password || !body.role)
    return jsonError("invalid_request", "name, email, password and role are required");
  if (!ROLES.includes(body.role))
    return jsonError("invalid_request", `role must be one of: ${ROLES.join(", ")}`);
  if (body.password.length < 8)
    return jsonError("invalid_request", "password must be at least 8 characters");

  const { data: created, error: createErr } = await sb.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { name: body.name },
  });
  if (createErr || !created.user) {
    return jsonError("invalid_request", createErr?.message ?? "Failed to create user");
  }

  // The DB trigger inserts the admins row on auth.users insert; update name/role
  // in case the trigger defaults differ.
  const { data: adminRow, error: updateErr } = await sb
    .from("admins")
    .update({ name: body.name, role: body.role })
    .eq("id", created.user.id)
    .select("id, email, name, role, active, last_login, created_at")
    .single();
  if (updateErr) return jsonError("internal_error", updateErr.message, 500);

  await logAudit(auth.admin.email, "user-created", `Created admin ${body.email} (${body.role})`, created.user.id);
  return jsonOk(adminRow, { status: 201 });
}
