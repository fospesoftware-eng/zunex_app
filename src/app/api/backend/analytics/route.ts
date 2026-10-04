import { getAdminSupabase } from "@/lib/server/supabase";
import { getAllAdminStations } from "@/lib/server/adminStations";
import { FREE_PLANS, PLANS, WIFI_PLANS } from "@/lib/server/store";
import { jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";

export const dynamic = "force-dynamic";

const ALL_PLANS = [...PLANS, ...FREE_PLANS, ...WIFI_PLANS];
const PRICE_MAP = new Map(ALL_PLANS.map((p) => [p.id, p.pricePaise]));
const LABEL_MAP = new Map(ALL_PLANS.map((p) => [p.id, p.label]));

interface SessionRow {
  station_id: string;
  plan_id: string;
  state: string;
  created_at: string;
  stopped_at: string | null;
  ends_at: string | null;
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const empty = {
    hourly: new Array(24).fill(0) as number[],
    revenueTrend: new Array(24).fill(0) as number[],
    planShare: [] as { planId: string; label: string; count: number; pct: number }[],
    topStations: [] as { id: string; name: string; sessions: number; utilization: number }[],
    totalSessions7d: 0,
  };

  const sb = getAdminSupabase();
  if (!sb) return jsonOk(empty);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000);

  const { data: rows, error } = await sb
    .from("sessions")
    .select("station_id, plan_id, state, created_at, stopped_at, ends_at")
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("[analytics] sessions query error:", error);
    return jsonOk(empty);
  }

  const sessions = (rows ?? []) as SessionRow[];
  const now = Date.now();
  const startOfDayMs = startOfDay.getTime();

  // --- Hourly distribution + revenue trend (today, 24 buckets) -------------
  const hourly = new Array(24).fill(0) as number[];
  const revenueTrend = new Array(24).fill(0) as number[];

  // --- Plan share + per-station aggregates (last 7 days) -------------------
  const planCounts = new Map<string, number>();
  const stationAgg = new Map<string, { sessions: number; minutes: number }>();

  for (const s of sessions) {
    const createdMs = new Date(s.created_at).getTime();

    if (createdMs >= startOfDayMs) {
      const hour = new Date(s.created_at).getHours();
      hourly[hour]++;
      if (s.state === "completed") {
        revenueTrend[hour] += (PRICE_MAP.get(s.plan_id) ?? 0) / 100;
      }
    }

    planCounts.set(s.plan_id, (planCounts.get(s.plan_id) ?? 0) + 1);

    const agg = stationAgg.get(s.station_id) ?? { sessions: 0, minutes: 0 };
    agg.sessions++;
    const endMs = s.stopped_at
      ? new Date(s.stopped_at).getTime()
      : s.ends_at
        ? new Date(s.ends_at).getTime()
        : now;
    agg.minutes += Math.max(0, (endMs - createdMs) / 60000);
    stationAgg.set(s.station_id, agg);
  }

  const totalSessions7d = sessions.length;

  const planShare = [...planCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([planId, count]) => ({
      planId,
      label: LABEL_MAP.get(planId) ?? planId,
      count,
      pct: totalSessions7d > 0 ? Math.round((count / totalSessions7d) * 100) : 0,
    }));

  const stations = await getAllAdminStations();
  const nameMap = new Map(stations.map((s) => [s.id, s.name]));
  const windowMinutes = 7 * 24 * 60;

  const topStations = [...stationAgg.entries()]
    .sort((a, b) => b[1].sessions - a[1].sessions)
    .slice(0, 5)
    .map(([id, agg], i) => ({
      rank: i + 1,
      id,
      name: nameMap.get(id) ?? id,
      sessions: agg.sessions,
      utilization: Math.min(100, Math.round((agg.minutes / windowMinutes) * 100)),
    }));

  return jsonOk({ hourly, revenueTrend, planShare, topStations, totalSessions7d });
}
