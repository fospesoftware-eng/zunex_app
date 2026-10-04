import { getAdminSupabase } from "@/lib/server/supabase";
import { computeAdminStationStatus, getAllAdminStations } from "@/lib/server/adminStations";
import { jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";

export const dynamic = "force-dynamic";

function pricePaiseForPlan(planId: string): number {
  const map: Record<string, number> = {
    "1hr": 4900, "3hr": 12900, "6hr": 22900, "12hr": 39900,
    "free-15m": 0, "wifi-1hr": 1900, "wifi-3hr": 4900,
  };
  return map[planId] ?? 0;
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const stations = await getAllAdminStations();
  const totalStations = stations.length;
  const activeStations = stations.filter((s) => computeAdminStationStatus(s) !== "offline").length;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  const sb = getAdminSupabase();
  if (!sb) {
    return jsonOk({
      totalStations, activeStations,
      todaySessions: 0, todayRevenuePaise: 0, avgSessionMinutes: 0,
    });
  }

  const { data: sessions, error } = await sb
    .from("sessions")
    .select("plan_id, created_at, stopped_at, state")
    .gte("created_at", startOfDayIso);

  if (error) {
    console.error("[dashboard] sessions query error:", error);
    return jsonOk({
      totalStations, activeStations,
      todaySessions: 0, todayRevenuePaise: 0, avgSessionMinutes: 0,
    });
  }

  const now = Date.now();
  let todaySessions = 0;
  let todayRevenuePaise = 0;
  let totalSessionMinutes = 0;
  let counted = 0;

  for (const s of sessions ?? []) {
    todaySessions++;
    if (s.state === "completed") {
      todayRevenuePaise += pricePaiseForPlan(String(s.plan_id));
    }
    const created = new Date(String(s.created_at)).getTime();
    const end = s.stopped_at ? new Date(String(s.stopped_at)).getTime() : now;
    const durMin = Math.max(0, (end - created) / 60000);
    totalSessionMinutes += durMin;
    counted++;
  }

  const avgSessionMinutes = counted > 0 ? totalSessionMinutes / counted : 0;

  return jsonOk({
    totalStations,
    activeStations,
    todaySessions,
    todayRevenuePaise,
    avgSessionMinutes,
  });
}
