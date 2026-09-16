"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Zap, Wallet, TrendingUp, Cpu, Wifi, Calendar } from "lucide-react";
import { AnimatedStatCard } from "@/components/backend/AnimatedStatCard";
import { SparklineChart } from "@/components/backend/SparklineChart";
import { UtilizationDonut } from "@/components/backend/UtilizationDonut";

// Generates 24h-ish mock revenue/session data for the chart
function chartData() {
  const revenue = [1200, 1800, 2100, 1500, 2800, 3200, 2600, 3900, 4100, 3700, 4500, 5200, 4800, 5600, 6100, 5400, 6800, 7200, 6500, 7800, 8200, 7500, 8800, 9500];
  const sessions = [3, 5, 8, 4, 12, 18, 22, 31, 28, 35, 42, 38, 45, 51, 47, 55, 62, 58, 67, 71, 63, 78, 82, 89];
  return { revenue, sessions };
}

// Inline realtime heartbeat/pulse graph — a rolling window of samples
// that renders an ECG-style SVG path. A fresh value arrives every ~2s and
// a spike is drawn when charging events happen. Heartbeat-style "pulse"
// animation on the active value.
function HeartbeatGraph({
  values,
  width = 400,
  height = 120,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  // Build ECG-ish path: a regular line with sharp "beats" at peaks
  let path = "";
  values.forEach((v, i) => {
    const x = i * step;
    const y = height - (v / max) * (height - 20) - 10;
    // Sharp spike pattern at every 5th sample for that ECG feel
    if (i > 0 && i % 5 === 0 && values[i - 1] > 0) {
      path += ` L ${x - step * 0.15} ${height - 10}`; // drop to baseline
      path += ` L ${x - step * 0.05} ${y}`;           // sharp up
      path += ` L ${x + step * 0.05} ${y}`;           // flat top
      path += ` L ${x + step * 0.15} ${height - 10}`; // drop to baseline
    } else {
      path += (i === 0 ? "M" : "L") + ` ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  });

  const lastX = (values.length - 1) * step;
  const lastY = height - (values[values.length - 1] / max) * (height - 20) - 10;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {/* Subtle baseline grid */}
      <line x1="0" y1={height - 10} x2={width} y2={height - 10} stroke="rgba(36,71,255,0.08)" strokeWidth="1" />
      {/* Main heartbeat line */}
      <motion.path
        d={path}
        fill="none"
        stroke="#2447ff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      />
      {/* Animated trailing dot */}
      <motion.circle
        cx={lastX}
        cy={lastY}
        r="4"
        fill="#2447ff"
        animate={{ scale: [1, 2.2, 1], opacity: [1, 0.2, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  );
}

export default function DashboardPage() {
  const d = chartData();
  const [realtime, setRealtime] = useState({
    liveCharging: 2,
    lastHeartbeatMs: Date.now(),
  });
  const [hbHistory, setHbHistory] = useState<number[]>(Array(20).fill(0));
  const hbRef = useRef(hbHistory);
  hbRef.current = hbHistory;

  // Live ticker — update charging count + heartbeat graph every 2s
  useEffect(() => {
    const tick = setInterval(() => {
      setRealtime((prev) => {
        // Oscillate 1..6 with occasional spikes
        let next = prev.liveCharging + Math.floor(Math.random() * 3) - 1;
        next = Math.max(1, Math.min(6, next));
        const now = Date.now();
        // Push the new value onto the rolling window, drop the oldest
        setHbHistory((h) => {
          const nextArr = [...h.slice(1), next];
          return nextArr;
        });
        return { liveCharging: next, lastHeartbeatMs: now };
      });
    }, 2000);
    return () => clearInterval(tick);
  }, []);

  // System tick — update totals (sessions + revenue) slower
  const [totals, setTotals] = useState({
    totalStations: 6,
    activeStations: 5,
    todaySessions: 89,
    todayRevenuePaise: 950000,
    avgSessionMinutes: 22,
  });
  useEffect(() => {
    const tick = setInterval(() => {
      setTotals((prev) => ({
        ...prev,
        todaySessions: prev.todaySessions + (Math.random() > 0.6 ? 1 : 0),
        todayRevenuePaise: prev.todayRevenuePaise + Math.floor(Math.random() * 15000),
      }));
    }, 6000);
    return () => clearInterval(tick);
  }, []);

  // Time since last heartbeat (updates every 1s)
  const [hbAge, setHbAge] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setHbAge(Math.floor((Date.now() - realtime.lastHeartbeatMs) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [realtime.lastHeartbeatMs]);

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
          label="Live charging"
          value={realtime.liveCharging}
          suffix=""
          trend="real-time"
          trendPositive
          icon={Zap}
          iconBgFrom="from-[#7dedc4]/30"
          iconBgTo="to-[#7dedc4]/5"
        />
        <AnimatedStatCard
          label="Revenue today"
          value={totals.todayRevenuePaise / 100}
          prefix="₹"
          trend="+8.4%"
          trendPositive
          icon={Wallet}
          iconBgFrom="from-[#22c55e]/30"
          iconBgTo="to-[#22c55e]/5"
        />
        <AnimatedStatCard
          label="Active stations"
          value={totals.activeStations}
          suffix={` / ${totals.totalStations}`}
          trend="1 offline"
          trendPositive={false}
          icon={Cpu}
          iconBgFrom="from-[#f59e0b]/30"
          iconBgTo="to-[#f59e0b]/5"
        />
        <AnimatedStatCard
          label="Today sessions"
          value={totals.todaySessions}
          suffix=""
          trend="+12%"
          trendPositive
          icon={TrendingUp}
          iconBgFrom="from-[#a78bfa]/30"
          iconBgTo="to-[#a78bfa]/5"
        />
      </div>

      {/* Charts + heartbeat row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* 2/3 revenue + sessions charts */}
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

        {/* 1/3 — Real-time charging + heartbeat graph */}
        <div className="glass-premium p-6 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Realtime charging</h3>
            <span className="flex items-center gap-1.5">
              <motion.span
                className="w-2 h-2 rounded-full bg-[#7dedc4]"
                animate={{ scale: [1, 1.35, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="text-[11px] text-[#7dedc4] tracking-wider">LIVE</span>
            </span>
          </div>

          {/* Big animated number */}
          <div className="flex items-end gap-3 mb-1">
            <motion.span
              key={realtime.liveCharging}
              initial={{ scale: 1.3, opacity: 0.2 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-5xl font-bold text-white leading-none numeral"
            >
              {realtime.liveCharging}
            </motion.span>
            <span className="text-paper-dim text-[13px] mb-1.5">charging now</span>
          </div>
          <p className="text-[11px] text-paper-dim mb-4">
            Last heartbeat <span className="text-[#7dedc4]">{hbAge}s</span> ago · updating every 2s
          </p>

          {/* Heartbeat pulse graph */}
          <div className="flex-1 min-h-[80px] bg-white/[0.02] rounded-xl border border-white/[0.05] p-3">
            <HeartbeatGraph values={hbHistory} width={400} height={100} />
          </div>

          {/* Mini stats row */}
          <dl className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
            <div className="flex justify-between items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <dt className="text-paper-dim text-[11px]">Active stations</dt>
              <dd className="text-white font-semibold numeral">{totals.activeStations}</dd>
            </div>
            <div className="flex justify-between items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <dt className="text-paper-dim text-[11px]">Ports in use</dt>
              <dd className="text-[#a9bcff] font-semibold numeral">{realtime.liveCharging}</dd>
            </div>
          </dl>

          {/* MQTT status pill */}
          <div className="mt-3 flex items-center gap-2 text-[12px]">
            <span className="flex items-center gap-1.5 text-[#7dedc4]">
              <Wifi size={12} />
              Broker connected
            </span>
            <span className="text-paper-dim/50">·</span>
            <span className="text-paper-dim">12 ms p95</span>
          </div>
        </div>
      </div>

      {/* Bottom row — system health + quick station grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* System health */}
        <div className="glass-premium p-6">
          <h3 className="text-sm font-semibold text-white mb-4">System health</h3>
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
                <Calendar size={12} className="text-[#a9bcff]" /> {hbAge}s ago
              </dd>
            </div>
          </dl>
        </div>

        {/* Quick station grid */}
        <div className="glass-premium p-6">
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
  );
}
