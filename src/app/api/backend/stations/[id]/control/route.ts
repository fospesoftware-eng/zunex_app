import { updateAdminStation } from "@/lib/server/adminStations";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { logAudit } from "@/lib/server/audit";

export const dynamic = "force-dynamic";

interface ControlBody {
  action: "offline" | "available" | "busy";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: ControlBody;
  try {
    body = (await req.json()) as ControlBody;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!["offline", "available", "busy"].includes(body.action))
    return jsonError("invalid_request", "action must be offline | available | busy");
  const { id } = await params;
  const updated = await updateAdminStation(id, { forceStatus: body.action });
  if (!updated) return jsonError("station_not_found", undefined, 404);
  await logAudit(
    auth.admin.email,
    body.action === "offline" ? "station-offline" : "station-started",
    `Station ${id} forced ${body.action}`,
    id,
  );
  return jsonOk({ ok: true });
}
