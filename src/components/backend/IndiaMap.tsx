"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface StationMapPoint {
  x: number;
  y: number;
  name: string;
  city: string;
  status: "available" | "busy" | "offline";
  deviceModel: "core" | "plus";
  installType: "car" | "mall" | "retail" | "outdoor" | "highway" | "office";
  stationId: string;
}

const statusColors: Record<string, string> = {
  available: "#7dedc4",
  busy: "#fbbf24",
  offline: "#f87171",
};

const modelBadge: Record<string, { bg: string; label: string }> = {
  core: { bg: "#4a63ff", label: "Core" },
  plus: { bg: "#a855f7", label: "Plus" },
};

/**
 * Real India outline — CC0 from SVGRepo (www.svgrepo.com/svg/308279/india-map-country).
 * viewBox 0 0 241 260; we scale it up in the SVG container.
 */
const INDIA_OUTLINE =
  "M 227.822,63.335 L 215.884,64.816 L 195.815,80.809 L 197.159,87.984 L 179.343,90.9 L 171.988,87.529 L 170.643,79.845 L 163.422,80.02 L 165.128,93.27 L 146.79,93.703 L 121.821,86.002 L 100.271,74.179 L 106.398,62.15 L 90.884,51.603 L 89.61,41.434 L 93.782,43.975 L 98.261,41.155 L 93.118,31.532 L 102.741,22.739 L 104.772,15.626 L 97.113,12.953 L 82.998,15.439 L 68.397,2 L 52.291,3.126 L 47.145,9.69 L 58.727,18.336 L 55.858,21.297 L 52.997,21.914 L 52.814,35.434 L 63.024,41.67 L 34.41,80.535 L 22.268,79.373 L 14.591,89.807 L 26.46,109.512 L 17.324,113.75 L 7.186,112.018 L 2.289,116.552 L 10.581,125.209 L 9.784,132.863 L 23.954,145.028 L 24.25,144.8 L 37.85,140.7 L 39.582,147.898 L 39.855,169.221 L 58.216,223.805 L 62.682,232.394 L 68.741,252.441 L 73.594,258 L 82.205,257.339 L 83.845,251.986 L 98.311,235.424 L 98.311,233.897 L 98.015,226.243 L 98.357,225.15 L 102.366,211.822 L 101.957,211.572 L 102.116,211.185 L 102.366,211.822 L 102.207,211.048 L 100.157,197.766 L 101.957,191.866 L 134.397,168.287 L 140.16,160.633 L 143.737,154.984 L 153.578,152.455 L 162.076,137.579 L 167.497,134.252 L 175.448,136.394 L 168.5,105.412 L 168.181,93.908 L 177.999,95.798 L 179.594,102.428 L 184.265,104.774 L 200.826,105.002 L 199.186,109.284 L 200.621,116.712 L 204.198,130.198 L 210.167,121.153 L 208.959,113.112 L 214.745,113.727 L 218.96,99.625 L 222.879,88.44 L 234.451,81.128 L 238.711,74.794 Z";

export function IndiaMap({ stations }: { stations: StationMapPoint[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const active = selected ?? hovered;

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-[#0a0f22] via-[#0b1028] to-[#0c1330]">
      {/* Radial glow backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 45% 40%, rgba(36,71,255,0.22), transparent 70%)",
        }}
      />

      {/* Soft tech grid overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(74, 99, 255, 0.06)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* India outline — viewBox 0 0 241 260, matches the polygon we downloaded */}
      <svg
        viewBox="0 0 241 260"
        className="relative w-full h-full z-10"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="indiaFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#13204a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0b1430" stopOpacity="0.95" />
          </linearGradient>
          <filter id="indiaGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Glow shadow layer */}
        <path
          d={INDIA_OUTLINE}
          fill="none"
          stroke="rgba(36,71,255,0.35)"
          strokeWidth="3"
          filter="url(#indiaGlow)"
          transform="translate(1, 1)"
        />

        {/* Main India outline */}
        <path
          d={INDIA_OUTLINE}
          fill="url(#indiaFill)"
          stroke="rgba(122, 145, 255, 0.55)"
          strokeWidth="0.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Interior subtle grid lines on landmass for premium look */}
        <g opacity="0.06" pointerEvents="none">
          <line x1="0" y1="60" x2="241" y2="60" stroke="white" strokeWidth="0.4" />
          <line x1="0" y1="120" x2="241" y2="120" stroke="white" strokeWidth="0.4" />
          <line x1="0" y1="180" x2="241" y2="180" stroke="white" strokeWidth="0.4" />
          <line x1="60" y1="0" x2="60" y2="260" stroke="white" strokeWidth="0.4" />
          <line x1="120" y1="0" x2="120" y2="260" stroke="white" strokeWidth="0.4" />
          <line x1="180" y1="0" x2="180" y2="260" stroke="white" strokeWidth="0.4" />
        </g>

        {/* Pins */}
        {stations.map((s) => {
          const color = statusColors[s.status];
          const isActive = active === s.stationId;
          return (
            <g
              key={s.stationId}
              transform={`translate(${s.x}, ${s.y})`}
              onMouseEnter={() => setHovered(s.stationId)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelected(selected === s.stationId ? null : s.stationId)}
              style={{ cursor: "pointer" }}
            >
              {/* Pulsing outer halo */}
              <motion.circle
                cx={0}
                cy={0}
                r={6}
                fill="none"
                stroke={color}
                strokeWidth={0.8}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0.05, 0.7] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Middle glow ring */}
              <motion.circle
                cx={0}
                cy={0}
                r={3.2}
                fill="#2447ff"
                fillOpacity={0.35}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
              />
              {/* Inner status dot */}
              <motion.circle
                cx={0}
                cy={0}
                r={1.8}
                fill={color}
                stroke="white"
                strokeWidth={0.4}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
              />
              {/* Label above when active */}
              <AnimatePresence>
                {isActive && (
                  <motion.g
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18 }}
                  >
                    <rect x={-12} y={-14} width={24} height={7} rx={2} fill="rgba(10,15,34,0.92)" stroke={color} strokeWidth={0.3} />
                    <text x={0} y={-8.5} textAnchor="middle" fill="white" fontSize={3.2} fontWeight={700}>
                      {s.city.slice(0, 8)}
                    </text>
                  </motion.g>
                )}
              </AnimatePresence>
            </g>
          );
        })}
      </svg>

      {/* Tooltip card for selected pin */}
      <AnimatePresence>
        {active && (() => {
          const s = stations.find((p) => p.stationId === active);
          if (!s) return null;
          const color = statusColors[s.status];
          const mb = modelBadge[s.deviceModel];
          return (
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-4 left-4 z-20 pointer-events-none"
              style={{ maxWidth: 260 }}
            >
              <div
                className="rounded-xl border border-white/15 px-4 py-3 backdrop-blur-xl"
                style={{ background: "rgba(10,15,34,0.92)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{s.name}</div>
                    <div className="text-xs text-paper-dim">{s.city}</div>
                  </div>
                  <div
                    className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}55` }}
                  >
                    {s.status}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded text-white"
                    style={{ backgroundColor: mb.bg }}
                  >
                    {mb.label}
                  </span>
                  <span className="text-[10px] text-paper-dim uppercase tracking-wider">{s.installType}</span>
                </div>
                <div className="text-[10px] font-mono text-paper-dim/60 mt-1">{s.stationId}</div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
