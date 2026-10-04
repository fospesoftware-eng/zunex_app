// Shared admin auth helper — every /api/backend/* route uses this.
// Verifies Supabase Auth JWT from Authorization header, then checks
// that the user exists in public.admins with an active account.
import type { NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/server/supabase";
import type { AdminRole } from "@/lib/client/backendAuth";

export interface AdminContext {
  userId: string;
  email: string;
  name: string | null;
  role: AdminRole;
}

export type AuthResult =
  | { ok: true; admin: AdminContext }
  | { ok: false; response: Response };

/**
 * Verifies the request carries a valid Supabase Auth JWT and that the
 * user is an active admin. Returns the admin's role for downstream
 * permission checks.
 *
 * Usage in route handlers:
 *   const auth = await requireAdmin(req);
 *   if (!auth.ok) return auth.response;
 *   // auth.admin.role is now available
 */
export async function requireAdmin(req: NextRequest | Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, code: "unauthorized", message: "Missing Bearer token" },
        { status: 401 },
      ),
    };
  }

  const token = authHeader.slice(7);
  const supabase = getAdminSupabase();
  if (!supabase) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, code: "misconfigured", message: "Supabase admin client not configured" },
        { status: 500 },
      ),
    };
  }

  // Verify JWT with Supabase Auth
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, code: "unauthorized", message: "Invalid or expired token" },
        { status: 401 },
      ),
    };
  }

  // Check admins table
  const { data: admin, error: adminErr } = await supabase
    .from("admins")
    .select("id, email, name, role")
    .eq("id", user.id)
    .eq("active", true)
    .single();

  if (adminErr || !admin) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, code: "forbidden", message: "Not an active admin account" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    admin: {
      userId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role as AdminRole,
    },
  };
}

/**
 * Role hierarchy check. Returns true if `role` has at least `required` level.
 */
export function hasRole(role: AdminRole, required: AdminRole): boolean {
  const levels: Record<AdminRole, number> = {
    super_admin: 4,
    admin: 3,
    operator: 2,
    support: 1,
  };
  return levels[role] >= levels[required];
}

/**
 * Require a minimum role. Returns 403 if the admin's role is insufficient.
 */
export async function requireRole(
  req: NextRequest | Request,
  minRole: AdminRole,
): Promise<AuthResult> {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth;
  if (!hasRole(auth.admin.role, minRole)) {
    return {
      ok: false,
      response: Response.json(
        { ok: false, code: "forbidden", message: `Requires ${minRole} role or higher` },
        { status: 403 },
      ),
    };
  }
  return auth;
}
