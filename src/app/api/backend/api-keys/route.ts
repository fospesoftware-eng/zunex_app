import { createHash, randomBytes } from "node:crypto";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { getAdminSupabase } from "@/lib/server/supabase";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

// NEVER select key_hash — hashes must not leave the server.
const SELECT_COLS = "id,name,key_prefix,permissions,last_used_at,revoked,created_at";
const ALLOWED_PERMS = new Set(["read", "write", "admin"]);

function generateKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(24);
  let out = "";
  for (let i = 0; i < 24; i++) out += chars[bytes[i] % chars.length];
  return `znx_live_${out}`;
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const sb = getAdminSupabase();
  if (!sb) return jsonError("misconfigured", "Supabase admin client not configured", 500);
  const { data, error } = await sb
    .from("api_keys")
    .select(SELECT_COLS)
    .order("created_at", { ascending: false });
  if (error) return jsonError("db_error", error.message, 500);
  return jsonOk(data ?? []);
}

interface CreateBody {
  name?: string;
  permissions?: string[];
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
  const name = body.name?.trim();
  if (!name) return jsonError("invalid_request", "name is required");
  const permissions = (body.permissions ?? ["read"]).filter((p) => ALLOWED_PERMS.has(p));

  const fullKey = generateKey();
  const row = {
    id: `key_${randomBytes(8).toString("hex")}`,
    name,
    key_prefix: fullKey.slice(0, 12),
    key_hash: createHash("sha256").update(fullKey).digest("hex"),
    permissions,
    created_at: Date.now(),
  };
  const { data, error } = await sb.from("api_keys").insert(row).select(SELECT_COLS).single();
  if (error) return jsonError("db_error", error.message, 500);
  await logAudit(auth.admin.email, "apikey-created", `Created API key "${name}"`, data.id);
  // fullKey is returned exactly once — it is never stored in plaintext.
  return jsonOk({ ...data, fullKey }, { status: 201 });
}
