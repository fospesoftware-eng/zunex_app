import {
  computeAdminStationStatus,
  deleteAdminStation,
  getAdminStation,
  updateAdminStation,
} from "@/lib/server/adminStations";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const s = getAdminStation(id);
  if (!s) return jsonError("station_not_found", undefined, 404);
  return jsonOk({ ...s, liveStatus: computeAdminStationStatus(s) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  let patch: Partial<{
    name: string;
    location: string;
    powerWatts: number;
    connector: string;
    baseStatus: "available" | "maintenance" | "offline";
    deviceModel: "core" | "plus";
    installType: "car" | "mall" | "retail" | "outdoor" | "highway" | "office";
    city: string;
    state: string;
    lat: number;
    lng: number;
  }>;
  try {
    patch = (await req.json()) as typeof patch;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  const { id } = await params;
  const updated = updateAdminStation(id, patch);
  if (!updated) return jsonError("station_not_found", undefined, 404);
  return jsonOk({ ...updated, liveStatus: computeAdminStationStatus(updated) });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = deleteAdminStation(id);
  if (!ok) return jsonError("station_not_found", undefined, 404);
  return jsonOk({ deleted: true });
}
