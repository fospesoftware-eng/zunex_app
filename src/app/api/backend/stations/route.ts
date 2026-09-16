import { computeAdminStationStatus, createAdminStation, getAllAdminStations } from "@/lib/server/adminStations";
import { jsonError, jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  const stations = getAllAdminStations().map((s) => ({
    ...s,
    liveStatus: computeAdminStationStatus(s),
  }));
  return jsonOk(stations);
}

interface CreateBody {
  id?: string;
  name?: string;
  location?: string;
  powerWatts?: number;
  connector?: string;
  baseStatus?: "available" | "maintenance" | "offline";
  deviceModel?: "core" | "plus";
  installType?: "car" | "mall" | "retail" | "outdoor" | "highway" | "office";
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return jsonError("invalid_request", "Malformed body");
  }
  if (!body.id || !body.name || !body.location)
    return jsonError("invalid_request", "id, name and location are required");
  const station = createAdminStation({
    id: body.id,
    name: body.name,
    location: body.location,
    powerWatts: body.powerWatts ?? 30,
    connector: body.connector ?? "USB-C",
    baseStatus: body.baseStatus ?? "available",
    deviceModel: body.deviceModel ?? "core",
    installType: body.installType ?? "office",
    city: body.city ?? "",
    state: body.state ?? "",
    lat: body.lat ?? 0,
    lng: body.lng ?? 0,
  });
  return jsonOk({ ...station, liveStatus: computeAdminStationStatus(station) }, { status: 201 });
}
