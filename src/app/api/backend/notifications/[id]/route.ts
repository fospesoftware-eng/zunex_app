import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { getAdminSupabase } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

interface PatchBody {
  read?: boolean;
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
  if (typeof body.read !== "boolean") {
    return jsonError("invalid_request", "read must be a boolean");
  }
  const { id } = await params;
  const { data, error } = await sb
    .from("notifications")
    .update({ read: body.read })
    .eq("id", id)
    .select("id,category,title,description,source,read,created_at")
    .single();
  if (error) return jsonError("db_error", error.message, 500);
  if (!data) return jsonError("not_found", "Notification not found", 404);
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
  const { error } = await sb.from("notifications").delete().eq("id", id);
  if (error) return jsonError("db_error", error.message, 500);
  return jsonOk({ deleted: true });
}
