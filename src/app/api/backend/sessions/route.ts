import { getAdminSupabase } from "@/lib/server/supabase";
import { jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const sb = getAdminSupabase();
  if (!sb) return jsonOk([]);

  const { data, error } = await sb
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[sessions] list error:", error);
    return jsonOk([]);
  }

  return jsonOk(data ?? []);
}
