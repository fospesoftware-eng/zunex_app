import { jsonError } from "@/lib/server/http";
import { requireAdmin } from "@/app/api/backend/_auth";
import { getAdminSupabase } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";

type ReportType = "daily-ops" | "revenue" | "hardware-health";
const VALID_TYPES = new Set<ReportType>(["daily-ops", "revenue", "hardware-health"]);

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface SessionRow {
  id: string;
  station_id: string;
  plan_id: string;
  started_at: string;
  state: string | null;
  delivered_kwh: number | null;
}

async function buildDailyOps(sb: NonNullable<ReturnType<typeof getAdminSupabase>>, from: string, to: string): Promise<string | Response> {
  const end = new Date(`${to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const { data, error } = await sb
    .from("sessions")
    .select("id,station_id,plan_id,started_at,state,delivered_kwh")
    .gte("started_at", `${from}T00:00:00Z`)
    .lt("started_at", isoDay(end));
  if (error) return jsonError("db_error", error.message, 500);
  const sessions = (data ?? []) as SessionRow[];

  // Try to enrich with plan prices; fall back to count + kwh only.
  const planIds = [...new Set(sessions.map((s) => s.plan_id))];
  const priceByPlan = new Map<string, number>();
  let plansOk = false;
  if (planIds.length > 0) {
    const { data: plans, error: plansErr } = await sb.from("plans").select("id,price").in("id", planIds);
    if (!plansErr && plans) {
      plansOk = true;
      for (const p of plans as { id: string; price: number | null }[]) {
        if (typeof p.price === "number") priceByPlan.set(p.id, p.price);
      }
    }
  }

  const start = new Date(`${from}T00:00:00Z`);
  const days: string[] = [];
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(isoDay(d));
  }
  const rows = days.map((day) => {
    const daySessions = sessions.filter((s) => s.started_at.slice(0, 10) === day);
    const kwh = daySessions.reduce((sum, s) => sum + (s.delivered_kwh ?? 0), 0);
    const base: unknown[] = [day, daySessions.length, Number(kwh.toFixed(3))];
    if (plansOk) {
      const revenue = daySessions.reduce(
        (sum, s) => sum + (s.delivered_kwh ?? 0) * (priceByPlan.get(s.plan_id) ?? 0),
        0,
      );
      base.push(Number(revenue.toFixed(2)));
    }
    return base;
  });
  return toCsv(plansOk
    ? ["date", "sessions_count", "kwh_delivered", "revenue_estimate"]
    : ["date", "sessions_count", "kwh_delivered"], rows);
}

async function buildRevenue(sb: NonNullable<ReturnType<typeof getAdminSupabase>>, from: string, to: string): Promise<string | Response> {
  const end = new Date(`${to}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const { data, error } = await sb
    .from("sessions")
    .select("id,station_id,plan_id,started_at,state,delivered_kwh")
    .gte("started_at", `${from}T00:00:00Z`)
    .lt("started_at", isoDay(end));
  if (error) return jsonError("db_error", error.message, 500);
  const byPlan = new Map<string, { sessions: number; kwh: number }>();
  for (const s of (data ?? []) as SessionRow[]) {
    const agg = byPlan.get(s.plan_id) ?? { sessions: 0, kwh: 0 };
    agg.sessions += 1;
    agg.kwh += s.delivered_kwh ?? 0;
    byPlan.set(s.plan_id, agg);
  }
  const rows = [...byPlan.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([planId, agg]) => [planId, agg.sessions, Number(agg.kwh.toFixed(3))]);
  return toCsv(["plan_id", "sessions", "total_kwh"], rows);
}

async function buildHardwareHealth(sb: NonNullable<ReturnType<typeof getAdminSupabase>>): Promise<string | Response> {
  const { data, error } = await sb
    .from("hardware")
    .select("id,device_id,device_type,station_id,connection_status,firmware_version,last_seen_at,telemetry_enabled")
    .order("id");
  if (error) return jsonError("db_error", error.message, 500);
  const rows = (data ?? []).map((h) => [
    h.id,
    h.device_id,
    h.device_type,
    h.station_id,
    h.connection_status,
    h.firmware_version,
    typeof h.last_seen_at === "number" ? new Date(h.last_seen_at).toISOString() : "",
    h.telemetry_enabled,
  ]);
  return toCsv(
    ["id", "device_id", "device_type", "station_id", "connection_status", "firmware_version", "last_seen_at", "telemetry_enabled"],
    rows,
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const sb = getAdminSupabase();
  if (!sb) return jsonError("misconfigured", "Supabase admin client not configured", 500);

  const { type } = await params;
  if (!VALID_TYPES.has(type as ReportType)) {
    return jsonError("invalid_request", "type must be daily-ops, revenue or hardware-health");
  }

  const url = new URL(req.url);
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setUTCDate(today.getUTCDate() - 7);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("from") ?? "")
    ? url.searchParams.get("from")!
    : isoDay(weekAgo);
  const to = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("to") ?? "")
    ? url.searchParams.get("to")!
    : isoDay(today);

  let result: string | Response;
  if (type === "daily-ops") result = await buildDailyOps(sb, from, to);
  else if (type === "revenue") result = await buildRevenue(sb, from, to);
  else result = await buildHardwareHealth(sb);
  if (result instanceof Response) return result;

  return new Response(result, {
    headers: {
      "content-type": "text/csv",
      "content-disposition": `attachment; filename="zunex-${type}-${from}-${to}.csv"`,
    },
  });
}
