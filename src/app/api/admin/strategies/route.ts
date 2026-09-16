import { adminConfig, newId, saveAdminConfig } from "@/lib/server/configStore";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/admin/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  return jsonOk(adminConfig().strategies);
}

interface CreateStrategy {
  timeSlot?: string;
  deviceRatioPct?: number;
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: CreateStrategy;
  try {
    body = (await req.json()) as CreateStrategy;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!body.timeSlot || typeof body.deviceRatioPct !== "number")
    return jsonError("invalid_request", "timeSlot and deviceRatioPct are required");
  const cfg = adminConfig();
  const strat = {
    id: newId("strat"),
    timeSlot: body.timeSlot,
    deviceRatioPct: Math.max(0, Math.min(100, body.deviceRatioPct)),
    enabled: true,
    createdAt: Date.now(),
  };
  cfg.strategies.push(strat);
  saveAdminConfig(cfg);
  return jsonOk(strat, { status: 201 });
}
