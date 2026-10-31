"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity, IndianRupee, Zap } from "lucide-react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { DataTable } from "@/components/backend/DataTable";
import type { ColumnDef } from "@/components/backend/DataTable";
import { Pill } from "@/components/backend/Pill";
import { getAccessToken } from "@/lib/client/backendAuth";

interface SessionRow {
  id: string;
  station_id: string;
  device_id: string | null;
  plan_id: string;
  amount_paise: number | null;
  payment_intent_id: string | null;
  state: string;
  created_at: string;
  started_at: string | null;
  stopped_at: string | null;
  ends_at: string | null;
  paid_at: string | null;
  delivered_kwh: number | null;
  power_kw: number | null;
}

const stateVariant: Record<string, "success" | "warn" | "error" | "info" | "default"> = {
  payment_pending: "warn",
  payment_successful: "info",
  starting: "warn",
  charging_active: "success",
  stopping: "warn",
  charging_completed: "default",
  completed: "default",
  cancelled: "error",
  error: "error",
};

const LIVE_STATES = new Set(["payment_successful", "starting", "charging_active", "stopping"]);

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString();
}

function fmtINR(paise: number | null): string {
  if (paise == null) return "—";
  if (paise === 0) return "Free";
  return `₹${(paise / 100).toFixed(2)}`;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch("/api/backend/sessions", { headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setSessions(j.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, [load]);

  const filtered = sessions.filter(
    (s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.station_id.toLowerCase().includes(search.toLowerCase()) ||
      (s.device_id ?? "").toLowerCase().includes(search.toLowerCase()) ||
      s.plan_id.toLowerCase().includes(search.toLowerCase()),
  );

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = sessions.filter((s) => new Date(s.created_at) >= startOfDay);
  const liveCount = sessions.filter((s) => LIVE_STATES.has(s.state)).length;
  const revenueToday = today
    .filter((s) => s.paid_at && s.amount_paise)
    .reduce((sum, s) => sum + (s.amount_paise ?? 0), 0);
  const energyToday = today.reduce((sum, s) => sum + (s.delivered_kwh ?? 0), 0);

  const columns: ColumnDef<SessionRow>[] = [
    { key: "station_id", header: "Station" },
    {
      key: "device_id",
      header: "Device",
      render: (r) =>
        r.device_id ? (
          <span className="text-xs font-mono text-paper-dim">{r.device_id}</span>
        ) : (
          <span className="text-xs text-paper-dim/50">—</span>
        ),
    },
    { key: "plan_id", header: "Plan" },
    {
      key: "amount_paise",
      header: "Amount",
      render: (r) => (
        <span className={`text-xs numeral ${r.amount_paise ? "text-paper" : "text-paper-dim/70"}`}>
          {fmtINR(r.amount_paise)}
        </span>
      ),
    },
    {
      key: "state",
      header: "State",
      render: (r) => (
        <Pill variant={stateVariant[r.state] ?? "default"}>{r.state.replace(/_/g, " ")}</Pill>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (r) => <span className="text-xs text-paper-dim">{fmtTime(r.created_at)}</span>,
    },
    {
      key: "paid_at",
      header: "Paid",
      render: (r) => <span className="text-xs text-paper-dim">{fmtTime(r.paid_at)}</span>,
    },
    {
      key: "stopped_at",
      header: "Stopped",
      render: (r) => <span className="text-xs text-paper-dim">{fmtTime(r.stopped_at)}</span>,
    },
    {
      key: "delivered_kwh",
      header: "Energy",
      render: (r) => (
        <span className="text-xs text-paper-dim numeral">
          {(r.delivered_kwh ?? 0).toFixed(2)} kWh
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Sessions" subtitle="Live view of every charging session on the network." />

      {/* Stat strip */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <GlassCard className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7dedc4]/10 text-[#7dedc4]">
            <Activity size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-paper numeral">{liveCount}</div>
            <div className="text-[11px] uppercase tracking-wider text-paper-dim/60">Charging now</div>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4a63ff]/10 text-[#a9bcff]">
            <IndianRupee size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-paper numeral">
              ₹{(revenueToday / 100).toFixed(2)}
            </div>
            <div className="text-[11px] uppercase tracking-wider text-paper-dim/60">
              Revenue today · {today.length} sessions
            </div>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#a855f7]/10 text-[#a855f7]">
            <Zap size={16} />
          </span>
          <div>
            <div className="text-lg font-semibold text-paper numeral">{energyToday.toFixed(2)} kWh</div>
            <div className="text-[11px] uppercase tracking-wider text-paper-dim/60">Energy today</div>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(r) => r.id}
          search={search}
          onSearchChange={setSearch}
          loading={loading}
          emptyMessage="No sessions yet — driver sessions appear here in real time"
        />
      </GlassCard>
    </div>
  );
}
