import { randomBytes } from "node:crypto";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { getAdminSupabase } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

const CATEGORIES = new Set(["Hardware", "Payment", "Station", "System"]);

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const sb = getAdminSupabase();
  if (!sb) return jsonError("misconfigured", "Supabase admin client not configured", 500);
  const url = new URL(req.url);
  let q = sb
    .from("notifications")
    .select("id,category,title,description,source,read,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (url.searchParams.get("unread") === "1") q = q.eq("read", false);
  const { data, error } = await q;
  if (error) return jsonError("db_error", error.message, 500);
  return jsonOk(data ?? []);
}

interface CreateBody {
  category?: string;
  title?: string;
  description?: string;
  source?: string;
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const sb = getAdminSupabase();
  if (!sb) return jsonError("misconfigured", "Supabase admin client not configured", 500);
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const category = body.category ?? "System";
  if (!CATEGORIES.has(category)) {
    return jsonError("invalid_request", "category must be Hardware, Payment, Station or System");
  }
  if (!body.title?.trim()) return jsonError("invalid_request", "title is required");
  const row = {
    id: `ntf_${randomBytes(8).toString("hex")}`,
    category,
    title: body.title.trim(),
    description: body.description ?? null,
    source: body.source ?? null,
    created_at: Date.now(),
  };
  const { data, error } = await sb.from("notifications").insert(row).select().single();
  if (error) return jsonError("db_error", error.message, 500);
  return jsonOk(data, { status: 201 });
}

interface PatchBody {
  all?: boolean;
}

export async function PATCH(req: Request) {
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
  if (body.all !== true) return jsonError("invalid_request", "Only { all: true } is supported here");
  const { error } = await sb.from("notifications").update({ read: true }).eq("read", false);
  if (error) return jsonError("db_error", error.message, 500);
  return jsonOk({ updated: true });
}
