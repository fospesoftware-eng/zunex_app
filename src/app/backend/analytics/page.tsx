"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { SparklineChart } from "@/components/backend/SparklineChart";

// Deterministic pseudo-random for 24 hours — peak 18-22
function hourlyDistribution(): number[] {
  // Base curve with peak at 20h
  return [
    2, 3, 4, 3, 2, 4, 8, 14, 22, 30, 38, 45,
    52, 58, 65, 72, 80, 88, 95, 92, 78, 55, 35, 18,
  ];
}

const planPopularity = [
  { name: "Quick", value: 52, color: "#4a63ff" },
  { name: "Standard", value: 31, color: "#7dedc4" },
  { name: "Trial", value: 17, color: "#ffb020" },
];

const topStations = [
  { rank: 1, name: "ZUNEX One", id: "ZNX-A1", sessions: 234, utilization: 87 },
  { rank: 2, name: "ZUNEX B2", id: "ZNX-B2", sessions: 198, utilization: 72 },
  { rank: 3, name: "ZUNEX L1", id: "ZNX-L1", sessions: 156, utilization: 58 },
  { rank: 4, name: "ZUNEX K3", id: "ZNX-K3", sessions: 89, utilization: 34 },
];

export default function AnalyticsPage() {
  const [hourly, setHourly] = useState<number[]>([]);

  useEffect(() => {
    // Generate deterministically on mount
    setHourly(hourlyDistribution());
  }, []);

  const revenueTrend = useMemo(
    () => [
      1200, 1450, 1680, 1520, 1380, 1820, 2400, 2980, 3650, 4120, 4780, 5340,
      5890, 6450, 7020, 7680, 8340, 8920, 9450, 9120, 8450, 7230, 5890, 4320,
    ],
    [],
  );

  const maxHourly = Math.max(...hourly, 1);
  const chartHeight = 220;
  const barWidth = 14;
  const gap = 6;

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Usage, revenue and plan performance — lifetime overview."
      />

      {/* Hourly session distribution */}
      <GlassCard
        title="Hourly session distribution"
        subtitle="Today · sessions per hour"
      >
        {hourly.length > 0 && (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${hourly.length * (barWidth + gap)} ${chartHeight}`}
              className="w-full h-auto min-w-[560px]"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Y axis baseline */}
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
                      fill={
                        i >= 18 && i <= 22
                          ? "url(#barGradPeak)"
                          : "url(#barGrad)"
                      }
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
        )}
      </GlassCard>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Plan popularity */}
        <GlassCard
          title="Plan popularity"
          subtitle="Share of active users"
        >
          <div className="space-y-5">
            {planPopularity.map((p) => (
              <div key={p.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-paper font-medium">{p.name}</span>
                  <span className="text-sm text-paper-dim numeral">{p.value}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: p.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${p.value}%` }}
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
        </GlassCard>

        {/* Revenue trend */}
        <GlassCard
          title="Revenue trend"
          subtitle="Last 24 hours · ₹"
        >
          <SparklineChart
            data={revenueTrend}
            color="#ffb020"
            height={200}
            label="Revenue (₹)"
            xLabels={["00", "06", "12", "18", "24"]}
          />
        </GlassCard>
      </div>

      {/* Top stations */}
      <GlassCard title="Top stations" subtitle="Ranked by sessions this week">
        <div className="space-y-3">
          {topStations.map((s) => (
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
      </GlassCard>
    </div>
  );
}
