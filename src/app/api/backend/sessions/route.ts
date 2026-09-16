import { store } from "@/lib/server/store";
import { jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  const sessions = [...store.sessions.values()].sort((a, b) => b.createdAt - a.createdAt);
  return jsonOk(sessions);
}
