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
            "radial-gradient(ellipse at 50% 50%, rgba(36,71,255,0.18), transparent 75%)",
        }}
      />

      {/* Tech grid overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(74, 99, 255, 0.07)" strokeWidth="1" strokeDasharray="2 3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* India outline SVG */}
      <svg
        viewBox="0 0 800 600"
        className="relative w-full h-full z-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stylized India silhouette */}
        <path
          d="M 250 130 Q 300 90 370 85 Q 430 78 480 95 Q 530 110 570 140 Q 600 165 610 195 Q 615 220 600 245 Q 595 260 605 270 Q 620 278 640 280 Q 665 280 685 295 Q 700 310 710 330 Q 720 355 710 380 Q 695 400 675 415 Q 655 430 640 450 Q 625 470 610 490 Q 595 510 575 525 Q 555 540 535 545 Q 515 548 495 540 Q 475 535 460 515 Q 450 500 440 480 Q 430 460 420 445 Q 410 430 395 420 Q 380 410 365 415 Q 350 420 335 435 Q 320 450 310 465 Q 300 480 285 490 Q 265 500 245 495 Q 225 488 210 470 Q 195 450 190 425 Q 185 400 195 375 Q 205 350 220 330 Q 235 310 245 290 Q 253 270 250 250 Q 245 230 240 210 Q 235 190 240 170 Q 243 150 250 130 Z"
          fill="#0e1730"
          stroke="rgba(74, 99, 255, 0.4)"
          strokeWidth="2"
        />

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
                r={20}
                fill="none"
                stroke={color}
                strokeWidth={2}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.7, 0.1, 0.7] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              {/* Middle glow ring */}
              <motion.circle
                cx={0}
                cy={0}
                r={11}
                fill="none"
                stroke="#2447ff"
                strokeWidth={2}
                style={{ filter: "blur(2px)" }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.05 }}
              />
              {/* Inner status dot */}
              <motion.circle
                cx={0}
                cy={0}
                r={5}
                fill={color}
                stroke="white"
                strokeWidth={1.5}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.15 }}
              />
              {/* Label above when active */}
              <AnimatePresence>
                {isActive && (
                  <motion.g
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <rect
                      x={-42}
                      y={-44}
                      width={84}
                      height={28}
                      rx={6}
                      fill="rgba(10, 15, 34, 0.92)"
                      stroke={color}
                      strokeWidth={1}
                    />
                    <text x={0} y={-27} textAnchor="middle" fill="white" fontSize={11} fontWeight={600}>
                      {s.city}
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
              style={{ maxWidth: 280 }}
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
