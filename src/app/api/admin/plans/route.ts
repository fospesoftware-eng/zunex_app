import { FREE_PLANS, PLANS, WIFI_PLANS } from "@/lib/server/store";
import { jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/admin/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  return jsonOk({ PLANS, FREE_PLANS, WIFI_PLANS });
}
