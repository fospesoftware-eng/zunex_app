import { jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { listHardware, simulateHeartbeats } from "@/lib/server/hardwareStore";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  simulateHeartbeats();
  return jsonOk(listHardware());
}
