"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { SparklineChart } from "@/components/backend/SparklineChart";
import { getAccessToken } from "@/lib/client/backendAuth";

interface PlanShare {
  planId: string;
  label: string;
  count: number;
  pct: number;
}

interface TopStation {
  rank: number;
  id: string;
  name: string;
  sessions: number;
  utilization: number;
}

interface AnalyticsData {
  hourly: number[];
  revenueTrend: number[];
  planShare: PlanShare[];
  topStations: TopStation[];
  totalSessions7d: number;
}

const PLAN_COLORS = ["#4a63ff", "#7dedc4", "#ffb020", "#ff8a4d", "#a9bcff"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      try {
        const res = await fetch("/api/backend/analytics", { headers });
        const j = await res.json();
        if (j.ok) setData(j.data);
      } catch {
        // keep empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hourly = data?.hourly ?? [];
  const maxHourly = Math.max(...hourly, 1);

  // Highlight the top-3 busiest hours
  const peakHours = useMemo(() => {
    const indexed = hourly.map((v, i) => ({ v, i }));
    indexed.sort((a, b) => b.v - a.v);
    const top = indexed.filter((e) => e.v > 0).slice(0, 3).map((e) => e.i);
    return new Set(top);
  }, [hourly]);

  const chartHeight = 220;
  const barWidth = 14;
  const gap = 6;

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Usage, revenue and plan performance — live from LiveDB."
      />

      {/* Hourly session distribution */}
      <GlassCard
        title="Hourly session distribution"
        subtitle="Today · sessions per hour"
      >
        {loading ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-paper-dim/60">
            Loading analytics…
          </div>
        ) : hourly.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${hourly.length * (barWidth + gap)} ${chartHeight}`}
              className="w-full h-auto min-w-[560px]"
              preserveAspectRatio="xMidYMid meet"
            >
              <line
                x1={0}
                y1={chartHeight - 24}
                x2={hourly.length * (barWidth + gap)}
                y2={chartHeight - 24}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
              {hourly.map((val, i) => {
                const h = (val / maxHourly) * (chartHeight - 48);
                const x = i * (barWidth + gap) + gap / 2;
                const y = chartHeight - 24 - h;
                return (
                  <g key={i}>
                    <motion.rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={h}
                      rx={3}
                      fill={peakHours.has(i) ? "url(#barGradPeak)" : "url(#barGrad)"}
                      initial={{ height: 0, y: chartHeight - 24 }}
                      animate={{ height: h, y }}
                      transition={{
                        duration: 0.8,
                        delay: i * 0.02,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - 8}
                      textAnchor="middle"
                      fontSize="9"
                      fill="rgba(170,179,207,0.55)"
                    >
                      {i % 3 === 0 ? i : ""}
                    </text>
                  </g>
                );
              })}
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4a63ff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#2447ff" stopOpacity="0.5" />
                </linearGradient>
                <linearGradient id="barGradPeak" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffb020" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#ff8a4d" stopOpacity="0.5" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        ) : null}
      </GlassCard>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Plan popularity */}
        <GlassCard
          title="Plan popularity"
          subtitle="Share of sessions · last 7 days"
        >
          {loading ? (
            <div className="h-[140px] flex items-center justify-center text-sm text-paper-dim/60">
              Loading…
            </div>
          ) : data && data.planShare.length > 0 ? (
            <div className="space-y-5">
              {data.planShare.map((p, idx) => (
                <div key={p.planId}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-paper font-medium">{p.label}</span>
                    <span className="text-sm text-paper-dim numeral">
                      {p.pct}% · {p.count}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: PLAN_COLORS[idx % PLAN_COLORS.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${p.pct}%` }}
                      transition={{
                        duration: 0.9,
                        delay: 0.3,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-sm text-paper-dim/60">
              No sessions recorded in the last 7 days
            </div>
          )}
        </GlassCard>

        {/* Revenue trend */}
        <GlassCard
          title="Revenue trend"
          subtitle="Today · ₹ per hour"
        >
          {loading ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-paper-dim/60">
              Loading…
            </div>
          ) : (
            <SparklineChart
              data={data?.revenueTrend ?? new Array(24).fill(0)}
              color="#ffb020"
              height={200}
              label="Revenue (₹)"
              xLabels={["00", "06", "12", "18", "24"]}
            />
          )}
        </GlassCard>
      </div>

      {/* Top stations */}
      <GlassCard title="Top stations" subtitle="Ranked by sessions · last 7 days">
        {loading ? (
          <div className="h-[120px] flex items-center justify-center text-sm text-paper-dim/60">
            Loading…
          </div>
        ) : data && data.topStations.length > 0 ? (
          <div className="space-y-3">
            {data.topStations.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 rounded-xl bg-white/[0.02] border border-white/5 px-4 py-3"
              >
                <div className="w-7 h-7 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-xs font-semibold text-paper-dim numeral">
                  {s.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-paper truncate">{s.name}</span>
                    <span className="text-[10px] font-mono text-paper-dim">{s.id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-[#4a63ff] to-[#7dedc4]"
                        initial={{ width: 0 }}
                        animate={{ width: `${s.utilization}%` }}
                        transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <span className="text-[11px] text-paper-dim numeral w-10 text-right">
                      {s.utilization}%
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-paper numeral">{s.sessions}</div>
                  <div className="text-[10px] text-paper-dim uppercase tracking-wider">sessions</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[120px] flex items-center justify-center text-sm text-paper-dim/60">
            No station activity in the last 7 days
          </div>
        )}
      </GlassCard>
    </div>
  );
}
