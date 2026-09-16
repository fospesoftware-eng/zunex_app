import { FREE_PLANS, PLANS, WIFI_PLANS, store } from "@/lib/server/store";
import {
  computeAdminStationStatus,
  getAllAdminStations,
} from "@/lib/server/adminStations";
import { jsonOk } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";

export const dynamic = "force-dynamic";

function pricePaiseForPlan(planId: string): number {
  for (const p of PLANS) if (p.id === planId) return p.pricePaise;
  for (const p of FREE_PLANS) if (p.id === planId) return p.pricePaise;
  for (const p of WIFI_PLANS) if (p.id === planId) return p.pricePaise;
  return 0;
}

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) return auth.response;

  const stations = getAllAdminStations();
  const totalStations = stations.length;
  const activeStations = stations.filter((s) => computeAdminStationStatus(s) !== "offline").length;

  const now = Date.now();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayMs = startOfDay.getTime();

  let todaySessions = 0;
  let todayRevenuePaise = 0;
  let totalSessionMinutes = 0;
  let counted = 0;

  for (const s of store.sessions.values()) {
    if (s.createdAt >= startOfDayMs) {
      todaySessions++;
      if (s.paidAt) {
        todayRevenuePaise += pricePaiseForPlan(s.planId);
      }
      const end = s.completedAt ?? s.endsAt ?? now;
      const durMin = Math.max(0, (end - s.createdAt) / 60000);
      totalSessionMinutes += durMin;
      counted++;
    }
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
