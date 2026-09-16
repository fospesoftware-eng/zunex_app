"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Wallet, Users, TrendingUp, Activity, Cpu, Wifi, Calendar } from "lucide-react";
import { AnimatedStatCard } from "@/components/backend/AnimatedStatCard";
import { SparklineChart } from "@/components/backend/SparklineChart";
import { ActivityFeed } from "@/components/backend/ActivityFeed";
import { UtilizationDonut } from "@/components/backend/UtilizationDonut";

// Generates 24h-ish mock revenue/session data for the chart
function chartData() {
  const revenue = [1200, 1800, 2100, 1500, 2800, 3200, 2600, 3900, 4100, 3700, 4500, 5200, 4800, 5600, 6100, 5400, 6800, 7200, 6500, 7800, 8200, 7500, 8800, 9500];
  const sessions = [3, 5, 8, 4, 12, 18, 22, 31, 28, 35, 42, 38, 45, 51, 47, 55, 62, 58, 67, 71, 63, 78, 82, 89];
  return { revenue, sessions };
}

export default function DashboardPage() {
  const d = chartData();
  const [dash, setDash] = useState({
    totalStations: 4,
    activeStations: 3,
    todaySessions: 89,
    todayRevenuePaise: 950000,
    avgSessionMinutes: 22,
  });

  useEffect(() => {
    const tick = setInterval(() => {
      setDash((prev) => ({
        ...prev,
        todaySessions: prev.todaySessions + (Math.random() > 0.6 ? 1 : 0),
        todayRevenuePaise: prev.todayRevenuePaise + Math.floor(Math.random() * 15000),
      }));
    }, 6000);
    return () => clearInterval(tick);
  }, []);

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl tracking-tight text-white">Dashboard</h1>
        <p className="text-sm text-paper-dim mt-1">
          Live operations overview · {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
        </p>
      </div>

      {/* 4 StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatedStatCard
          label="Live sessions"
          value={dash.todaySessions}
          suffix=""
          trend="+12%"
          trendPositive
          icon={Activity}
        />
        <AnimatedStatCard
          label="Revenue today"
          value={dash.todayRevenuePaise / 100}
          prefix="₹"
          trend="+8.4%"
          trendPositive
          icon={Wallet}
          iconBgFrom="from-[#22c55e]/30"
          iconBgTo="to-[#22c55e]/5"
        />
        <AnimatedStatCard
          label="Active stations"
          value={dash.activeStations}
          suffix=" / 4"
          trend="1 busy"
          trendPositive={false}
          icon={Cpu}
          iconBgFrom="from-[#f59e0b]/30"
          iconBgTo="to-[#f59e0b]/5"
        />
        <AnimatedStatCard
          label="Avg session"
          value={dash.avgSessionMinutes}
          suffix=" min"
          trend="+1.2 min"
          trendPositive
          icon={TrendingUp}
          iconBgFrom="from-[#a78bfa]/30"
          iconBgTo="to-[#a78bfa]/5"
        />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Revenue & Sessions — last 24h</h3>
            <span className="text-[10px] text-paper-dim tracking-wider uppercase">Live · updating</span>
          </div>
          <SparklineChart
            data={d.revenue}
            color="#2447ff"
            height={200}
            label="Revenue (₹)"
            xLabels={["00", "06", "12", "18", "24"]}
          />
          <div className="mt-4 pt-4 border-t border-white/5">
            <SparklineChart
              data={d.sessions}
              color="#7dedc4"
              height={100}
              label="Sessions"
            />
          </div>
        </div>

        <div className="glass-premium p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Station utilization</h3>
          <UtilizationDonut
            total={4}
            active={2}
            busy={1}
            offline={1}
          />
        </div>
      </div>

      {/* Feed + extras */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
        <div className="space-y-4">
          {/* Real-time badge card */}
          <div className="glass-premium p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">System health</h3>
              <span className="flex items-center gap-2">
                <motion.span
                  className="w-2 h-2 rounded-full bg-[#7dedc4]"
                  animate={{ scale: [1, 1.35, 1], opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                />
                <span className="text-[11px] text-[#7dedc4] tracking-wider">LIVE</span>
              </span>
            </div>
            <dl className="space-y-3 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-paper-dim">MQTT broker</dt>
                <dd className="text-white font-medium flex items-center gap-1.5">
                  <Wifi size={12} className="text-[#7dedc4]" /> Connected
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-paper-dim">Payment gateway</dt>
                <dd className="text-white font-medium">Razorpay · healthy</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-paper-dim">Telemetry ingestion</dt>
                <dd className="text-white font-medium">12 ms p95</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-paper-dim">Last heartbeat</dt>
                <dd className="text-white font-medium flex items-center gap-1.5">
                  <Calendar size={12} className="text-[#a9bcff]" /> just now
                </dd>
              </div>
            </dl>
          </div>

          {/* Quick station grid */}
          <div className="glass-premium p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Quick station status</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "ZNX-A1", name: "ZUNEX One", status: "busy", dot: "#fbbf24" },
                { id: "ZNX-B2", name: "ZUNEX B2", status: "available", dot: "#7dedc4" },
                { id: "ZNX-L1", name: "ZUNEX L1", status: "available", dot: "#7dedc4" },
                { id: "ZNX-K3", name: "ZUNEX K3", status: "offline", dot: "#f87171" },
              ].map((s) => (
                <div key={s.id} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot, boxShadow: `0 0 8px ${s.dot}` }} />
                    <span className="text-[11px] font-mono text-paper-dim">{s.id}</span>
                  </div>
                  <div className="text-[12px] text-white font-medium">{s.name}</div>
                  <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: s.dot }}>{s.status}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
