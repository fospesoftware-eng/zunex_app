"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap, Wallet, TrendingUp, Cpu, Wifi, Calendar } from "lucide-react";
import { AnimatedStatCard } from "@/components/backend/AnimatedStatCard";
import { SparklineChart } from "@/components/backend/SparklineChart";
import { getAccessToken } from "@/lib/client/backendAuth";

interface DashboardData {
  totalStations: number;
  activeStations: number;
  todaySessions: number;
  todayRevenuePaise: number;
  avgSessionMinutes: number;
}

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
  let path = "";
  values.forEach((v, i) => {
    const x = i * step;
    const y = height - (v / max) * (height - 20) - 10;
    if (i > 0 && i % 5 === 0 && values[i - 1] > 0) {
      path += ` L ${x - step * 0.15} ${height - 10}`;
      path += ` L ${x - step * 0.05} ${y}`;
      path += ` L ${x + step * 0.05} ${y}`;
      path += ` L ${x + step * 0.15} ${height - 10}`;
    } else {
      path += (i === 0 ? "M" : "L") + ` ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  });

  const lastX = (values.length - 1) * step;
  const lastY = height - (values[values.length - 1] / max) * (height - 20) - 10;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <line x1="0" y1={height - 10} x2={width} y2={height - 10} stroke="rgba(36,71,255,0.08)" strokeWidth="1" />
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
  const [data, setData] = useState<DashboardData>({
    totalStations: 0,
    activeStations: 0,
    todaySessions: 0,
    todayRevenuePaise: 0,
    avgSessionMinutes: 0,
  });
  const [realtime, setRealtime] = useState({
    liveCharging: 0,
    lastHeartbeatMs: Date.now(),
  });
  const [hbHistory, setHbHistory] = useState<number[]>(Array(20).fill(0));
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch("/api/backend/dashboard", { headers });
    const j = await res.json();
    if (j.ok) setData(j.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Simulate live charging count from station data
  useEffect(() => {
    const tick = setInterval(() => {
      setRealtime((prev) => {
        const next = Math.max(0, Math.min(data.activeStations, prev.liveCharging + Math.floor(Math.random() * 3) - 1));
        setHbHistory((h) => [...h.slice(1), next]);
        return { liveCharging: next, lastHeartbeatMs: Date.now() };
      });
    }, 2000);
    return () => clearInterval(tick);
  }, [data.activeStations]);

  const [hbAge, setHbAge] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setHbAge(Math.floor((Date.now() - realtime.lastHeartbeatMs) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [realtime.lastHeartbeatMs]);

  // Placeholder chart data — will be replaced by real time-series from Supabase
  const chartRevenue = Array(24).fill(0).map((_, i) => data.todayRevenuePaise / 24 * (0.5 + Math.sin(i / 4) * 0.3 + Math.random() * 0.4));
  const chartSessions = Array(24).fill(0).map((_, i) => Math.round(data.todaySessions / 24 * (0.5 + Math.sin(i / 4) * 0.3 + Math.random() * 0.4)));

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight text-white">Dashboard</h1>
        <p className="text-sm text-paper-dim mt-1">
          Live operations overview · {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
        </p>
      </div>

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
          value={data.todayRevenuePaise / 100}
          prefix="₹"
          trend="—"
          trendPositive
          icon={Wallet}
          iconBgFrom="from-[#22c55e]/30"
          iconBgTo="to-[#22c55e]/5"
        />
        <AnimatedStatCard
          label="Active stations"
          value={data.activeStations}
          suffix={` / ${data.totalStations}`}
          trend={data.totalStations - data.activeStations > 0 ? `${data.totalStations - data.activeStations} offline` : "all online"}
          trendPositive={data.totalStations === data.activeStations}
          icon={Cpu}
          iconBgFrom="from-[#f59e0b]/30"
          iconBgTo="to-[#f59e0b]/5"
        />
        <AnimatedStatCard
          label="Today sessions"
          value={data.todaySessions}
          suffix=""
          trend="—"
          trendPositive
          icon={TrendingUp}
          iconBgFrom="from-[#a78bfa]/30"
          iconBgTo="to-[#a78bfa]/5"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-premium p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Revenue & Sessions — last 24h</h3>
            <span className="text-[10px] text-paper-dim tracking-wider uppercase">
              {loading ? "Loading…" : "Live · updating"}
            </span>
          </div>
          <SparklineChart
            data={chartRevenue}
            color="#2447ff"
            height={200}
            label="Revenue (₹)"
            xLabels={["00", "06", "12", "18", "24"]}
          />
          <div className="mt-4 pt-4 border-t border-white/5">
            <SparklineChart
              data={chartSessions}
              color="#7dedc4"
              height={100}
              label="Sessions"
            />
          </div>
        </div>

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

          <div className="flex-1 min-h-[80px] bg-white/[0.02] rounded-xl border border-white/[0.05] p-3">
            <HeartbeatGraph values={hbHistory} width={400} height={100} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-2 text-[12px]">
            <div className="flex justify-between items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <dt className="text-paper-dim text-[11px]">Active stations</dt>
              <dd className="text-white font-semibold numeral">{data.activeStations}</dd>
            </div>
            <div className="flex justify-between items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
              <dt className="text-paper-dim text-[11px]">Ports in use</dt>
              <dd className="text-[#a9bcff] font-semibold numeral">{realtime.liveCharging}</dd>
            </div>
          </dl>

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

      <div className="grid lg:grid-cols-2 gap-6">
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

        <div className="glass-premium p-6">
          <h3 className="text-sm font-semibold text-white mb-3">Quick station status</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "ZNX-A1", name: "Zunex Gateway", status: "busy", dot: "#fbbf24" },
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
