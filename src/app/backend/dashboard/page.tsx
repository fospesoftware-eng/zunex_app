"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { StatCard } from "@/components/backend/StatCard";
import { Pill } from "@/components/backend/Pill";
import { useToast } from "@/components/backend/Toast";
import { getStoredToken } from "@/lib/client/backendAuth";
import { motion } from "framer-motion";

interface DashboardData {
  totalStations: number;
  activeStations: number;
  todaySessions: number;
  todayRevenuePaise: number;
  avgSessionMinutes: number;
}

const SAMPLE_TIMELINE = [
  { hour: "06", count: 2 },
  { hour: "08", count: 12 },
  { hour: "10", count: 18 },
  { hour: "12", count: 14 },
  { hour: "14", count: 22 },
  { hour: "16", count: 35 },
  { hour: "18", count: 48 },
  { hour: "20", count: 30 },
  { hour: "22", count: 12 },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [sessions, setSessions] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    Promise.all([
      fetch("/api/backend/dashboard", { headers }).then((r) => r.json()),
      fetch("/api/backend/sessions", { headers }).then((r) => r.json()),
    ])
      .then(([dash, sess]) => {
        if (dash.ok) setData(dash.data);
        if (sess.ok) setSessions(sess.data.slice(0, 6));
      })
      .catch(() => toast.show("error", "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, [toast]);

  const maxCount = Math.max(...SAMPLE_TIMELINE.map((b) => b.count));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Live overview of the charging network."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total stations" value={loading ? "…" : data?.totalStations ?? 0} />
        <StatCard
          label="Active stations"
          value={loading ? "…" : data?.activeStations ?? 0}
          trend="vs yesterday"
          trendPositive
          accent="from-[#7dedc4]/30 to-[#2447ff]/10"
        />
        <StatCard
          label="Today's revenue"
          value={loading ? "…" : `₹${data ? (data.todayRevenuePaise / 100).toFixed(0) : 0}`}
          trend="+18.2%"
          trendPositive
          accent="from-[#ffb020]/30 to-[#2447ff]/10"
        />
        <StatCard
          label="Today's sessions"
          value={loading ? "…" : data?.todaySessions ?? 0}
          accent="from-[#a9bcff]/30 to-[#2447ff]/10"
        />
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <GlassCard title="Sessions · today" subtitle="Rolling timeline" className="lg:col-span-2">
          <div className="flex items-end gap-2 h-40">
            {SAMPLE_TIMELINE.map((b, i) => {
              const h = (b.count / maxCount) * 100;
              return (
                <div key={b.hour} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.6, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                      className="w-full rounded-t-md"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(125,151,255,0.9) 0%, rgba(36,71,255,0.6) 100%)",
                        boxShadow: "0 0 20px -4px rgba(74,99,255,0.6)",
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-paper-dim font-medium">{b.hour}</div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard title="Avg session" subtitle="Rolling 24h">
          <div className="font-display text-4xl font-semibold numeral text-paper">
            {loading ? "…" : (data?.avgSessionMinutes ?? 0).toFixed(1)}
            <span className="text-paper-dim text-base font-normal ml-2">min</span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Pill variant="success">▲ 4.1%</Pill>
            <span className="text-xs text-paper-dim">vs 7-day avg</span>
          </div>
        </GlassCard>
      </div>

      {/* Recent sessions */}
      <GlassCard title="Recent sessions" className="mt-6">
        {sessions.length === 0 ? (
          <div className="text-sm text-paper-dim text-center py-8">No sessions yet — try starting one.</div>
        ) : (
          <div className="divide-y divide-white/5 -mx-6">
            {sessions.map((s: any) => (
              <div key={s.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-paper font-medium">
                    {s.stationId} · {s.planId}
                  </div>
                  <div className="text-xs text-paper-dim">{s.id}</div>
                </div>
                <Pill variant={s.state === "charging_active" ? "success" : "info"}>{s.state}</Pill>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
