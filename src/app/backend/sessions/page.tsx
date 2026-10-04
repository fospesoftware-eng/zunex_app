"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { DataTable } from "@/components/backend/DataTable";
import type { ColumnDef } from "@/components/backend/DataTable";
import { Pill } from "@/components/backend/Pill";
import { useToast } from "@/components/backend/Toast";
import { getAccessToken } from "@/lib/client/backendAuth";

interface SessionRow {
  id: string;
  station_id: string;
  plan_id: string;
  state: string;
  created_at: string;
  stopped_at: string | null;
  ends_at: string | null;
  delivered_kwh: number;
  power_kw: number;
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

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const toast = useToast();

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
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, [load]);

  const filtered = sessions.filter(
    (s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.station_id.toLowerCase().includes(search.toLowerCase()) ||
      s.plan_id.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: ColumnDef<SessionRow>[] = [
    { key: "station_id", header: "Station" },
    { key: "plan_id", header: "Plan" },
    {
      key: "state",
      header: "State",
      render: (r) => (
        <Pill variant={stateVariant[r.state] ?? "default"}>{r.state.replace(/_/g, " ")}</Pill>
      ),
    },
    {
      key: "created_at",
      header: "Started",
      render: (r) => <span className="text-xs text-paper-dim">{new Date(r.created_at).toLocaleTimeString()}</span>,
    },
    {
      key: "stopped_at",
      header: "Stopped",
      render: (r) => r.stopped_at ? <span className="text-xs text-paper-dim">{new Date(r.stopped_at).toLocaleTimeString()}</span> : <span className="text-xs text-paper-dim/50">—</span>,
    },
    {
      key: "ends_at",
      header: "Ends at",
      render: (r) => r.ends_at ? <span className="text-xs text-paper-dim">{new Date(r.ends_at).toLocaleTimeString()}</span> : <span className="text-xs text-paper-dim/50">—</span>,
    },
    {
      key: "delivered_kwh",
      header: "Energy",
      render: (r) => <span className="text-xs text-paper-dim">{r.delivered_kwh.toFixed(1)} kWh</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Sessions" subtitle="Live view of every charging session on the network." />
      <GlassCard>
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(r) => r.id}
          search={search}
          onSearchChange={setSearch}
          loading={loading}
          emptyMessage="No active sessions"
        />
      </GlassCard>
    </div>
  );
}
