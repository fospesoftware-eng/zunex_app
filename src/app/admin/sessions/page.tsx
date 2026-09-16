"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/admin/GlassCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable } from "@/components/admin/DataTable";
import type { ColumnDef } from "@/components/admin/DataTable";
import { Pill } from "@/components/admin/Pill";
import { useToast } from "@/components/admin/Toast";
import { getStoredToken } from "@/lib/client/adminAuth";

interface SessionRow {
  id: string;
  stationId: string;
  planId: string;
  state: string;
  createdAt: number;
  paidAt: number | null;
  endsAt: number | null;
  completedAt: number | null;
}

const stateVariant: Record<string, "success" | "warn" | "error" | "info" | "default"> = {
  payment_pending: "warn",
  payment_successful: "info",
  starting: "warn",
  charging_active: "success",
  stopping: "warn",
  charging_completed: "default",
  cancelled: "error",
  error: "error",
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const toast = useToast();

  const load = () => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    fetch("/api/admin/sessions", { headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setSessions(j.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, []);

  const filtered = sessions.filter(
    (s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.stationId.toLowerCase().includes(search.toLowerCase()) ||
      s.planId.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: ColumnDef<SessionRow>[] = [
    { key: "stationId", header: "Station" },
    { key: "planId", header: "Plan" },
    {
      key: "state",
      header: "State",
      render: (r) => (
        <Pill variant={stateVariant[r.state] ?? "default"}>{r.state.replace("_", " ")}</Pill>
      ),
    },
    {
      key: "createdAt",
      header: "Started",
      render: (r) => <span className="text-xs text-paper-dim">{new Date(r.createdAt).toLocaleTimeString()}</span>,
    },
    {
      key: "paidAt",
      header: "Paid at",
      render: (r) => r.paidAt ? <span className="text-xs text-paper-dim">{new Date(r.paidAt).toLocaleTimeString()}</span> : <span className="text-xs text-paper-dim/50">—</span>,
    },
    {
      key: "endsAt",
      header: "Ends at",
      render: (r) => r.endsAt ? <span className="text-xs text-paper-dim">{new Date(r.endsAt).toLocaleTimeString()}</span> : <span className="text-xs text-paper-dim/50">—</span>,
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
