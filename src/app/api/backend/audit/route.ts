import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { getAdminSupabase } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const sb = getAdminSupabase();
  if (!sb) return jsonError("misconfigured", "Supabase admin client not configured", 500);
  const { data, error } = await sb
    .from("audit_log")
    .select("id,actor,action,description,target,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return jsonError("db_error", error.message, 500);
  return jsonOk(data ?? []);
}
