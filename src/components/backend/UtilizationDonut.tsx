"use client";

import { useEffect } from "react";
import { motion, useMotionValue, animate } from "framer-motion";

interface Props {
  total: number;
  active: number;
  busy: number;
  offline: number;
}

const SIZE = 220;
const STROKE = 16;
const CENTER = SIZE / 2;

export function UtilizationDonut({ total, active, busy, offline }: Props) {
  const count = useMotionValue(0);
  const rounded = useMotionValue(0);

  useEffect(() => {
    const controls = animate(count, total, {
      duration: 1.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => rounded.set(Math.round(v)),
    });
    return () => controls.stop();
  }, [total]);

  const radius = (groupIndex: number) =>
    CENTER - STROKE / 2 - groupIndex * (STROKE + 6);

  const circumference = (r: number) => 2 * Math.PI * r;

  const segments = [
    { label: "Online", value: active + busy, color: "#7dedc4", desc: "active + busy" },
    { label: "Available", value: active, color: "#4a63ff", desc: "ready" },
    { label: "Offline", value: offline, color: "#ff6a4d", desc: "down" },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[220px]">
        {/* Background rings */}
        {[0, 1, 2].map((i) => {
          const r = radius(i);
          return (
            <circle
              key={`bg-${i}`}
              cx={CENTER}
              cy={CENTER}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={STROKE}
            />
          );
        })}

        {/* Animated segments */}
        {segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const r = radius(i);
          const fullCircumference = circumference(r);
          const dashoffset = fullCircumference * (1 - seg.value / Math.max(total, 1));
          return (
            <motion.circle
              key={seg.label}
              cx={CENTER}
              cy={CENTER}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={fullCircumference}
              initial={{ strokeDashoffset: fullCircumference }}
              animate={{ strokeDashoffset: dashoffset }}
              transition={{ duration: 1.4, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              style={{ filter: `drop-shadow(0 0 6px ${seg.color}40)` }}
            />
          );
        })}

        {/* Center text */}
        <text
          x={CENTER}
          y={CENTER - 6}
          textAnchor="middle"
          fontSize="11"
          fill="rgba(170, 179, 207, 0.7)"
          fontFamily="var(--font-space), system-ui"
          letterSpacing="0.1em"
        >
          STATIONS
        </text>
        <motion.text
          x={CENTER}
          y={CENTER + 18}
          textAnchor="middle"
          fontSize="32"
          fontWeight="700"
          fill="#fff"
          fontFamily="var(--font-space), system-ui"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {rounded}
        </motion.text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-white/[0.04] border border-white/5"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: seg.color,
                boxShadow: `0 0 8px ${seg.color}80`,
              }}
            />
            <span className="text-paper-dim">{seg.label}</span>
            <span className="text-paper font-semibold">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
