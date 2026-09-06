"use client";

import { useEffect, useMemo } from "react";
import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { DotDigits } from "@/components/visuals/DotDigits";

// ---------------------------------------------------------------------------
// EnergyRing — a glass energy torus wrapped in an orbit system. The charged
// arc spills aurora light (sapphire → violet → champagne), two comets ride a
// hairline outer orbit, satellite sparks drift along the band, and a deep
// glass core lens holds the countdown.
// ---------------------------------------------------------------------------

function Ticks() {
  const ticks = useMemo(() => {
    const items: React.ReactElement[] = [];
    const n = 60;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const major = i % 5 === 0;
      const r1 = 96;
      const r2 = major ? 90.5 : 93;
      items.push(
        <line
          key={i}
          x1={100 + r1 * Math.cos(a)}
          y1={100 + r1 * Math.sin(a)}
          x2={100 + r2 * Math.cos(a)}
          y2={100 + r2 * Math.sin(a)}
          stroke="rgba(255,255,255,1)"
          strokeOpacity={major ? 0.22 : 0.09}
          strokeWidth={major ? 1.4 : 1}
          strokeLinecap="round"
        />,
      );
    }
    return items;
  }, []);
  return (
    <svg className="ring-ticks" viewBox="0 0 200 200" aria-hidden="true">
      {ticks}
    </svg>
  );
}

export default function EnergyRing({
  progress,
  countdown,
  settled = false,
}: {
  progress: number; // 0..1
  countdown: string;
  settled?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const p = useSpring(Math.min(Math.max(progress, 0), 1), {
    stiffness: 50,
    damping: 20,
    mass: 1,
  });
  useEffect(() => {
    p.set(Math.min(Math.max(progress, 0), 1));
  }, [progress, p]);
  useEffect(() => {
    if (reduceMotion) p.jump(Math.min(Math.max(progress, 0), 1));
  }, [progress, reduceMotion, p]);

  const angle = useTransform(p, (v) => v * 360);
  // Aurora charge gradient — deep sapphire through periwinkle and violet,
  // landing on champagne gold at the head.
  const arcBg = useMotionTemplate`conic-gradient(from 214deg, rgba(56,78,255,0.95) 0deg, rgba(125,151,255,0.98) calc(${angle} * 0.35), rgba(147,125,255,0.92) calc(${angle} * 0.68), rgba(255,193,77,1) ${angle}, rgba(255,255,255,0.05) ${angle}, rgba(255,255,255,0.05) 360deg)`;
  const settledBg = useMotionTemplate`conic-gradient(from 214deg, rgba(173,192,255,0.6) 0deg, rgba(242,245,255,0.92) 360deg)`;
  const bg = settled ? settledBg : arcBg;

  const orbitLive = !reduceMotion && !settled;

  return (
    <div
      className="ring-shell select-none"
      role="timer"
      aria-label={`Time remaining ${countdown}`}
    >
      <div className="ring-halo" aria-hidden="true" />
      <motion.div
        className="ring-arc-glow"
        style={{ background: bg, opacity: settled ? 0.25 : 0.6 }}
        aria-hidden="true"
      />
      <div className="ring-track" aria-hidden="true" />
      <motion.div className="ring-arc" style={{ background: bg }} aria-hidden="true" />
      <div className="ring-lens" aria-hidden="true" />
      <div className="ring-spec" aria-hidden="true" />
      {orbitLive ? <div className="ring-flow" aria-hidden="true" /> : null}
      {orbitLive ? <div className="ring-sheen" aria-hidden="true" /> : null}
      <Ticks />

      {/* Outer orbit — hairline path with two counter-rotating comets */}
      {orbitLive && (
        <div className="ring-orbit" aria-hidden="true">
          <span className="ring-orbit-ring" />
          <span
            className="ring-orbit-comet ring-orbit-comet-a"
            style={
              {
                "--orbit-duration": "13s",
              } as React.CSSProperties
            }
          >
            <i />
          </span>
          <span
            className="ring-orbit-comet ring-orbit-comet-b"
            style={
              {
                "--orbit-duration": "21s",
                "--orbit-direction": "reverse",
                "--orbit-delay": "-6s",
              } as React.CSSProperties
            }
          >
            <i />
          </span>
        </div>
      )}

      {/* Satellite sparks drifting along the glass band */}
      {orbitLive && (
        <>
          <span
            className="ring-spark"
            style={{ "--spark-duration": "11s" } as React.CSSProperties}
            aria-hidden="true"
          >
            <i />
          </span>
          <span
            className="ring-spark ring-spark-gold"
            style={
              {
                "--spark-duration": "19s",
                "--spark-direction": "reverse",
                "--spark-delay": "-4s",
              } as React.CSSProperties
            }
            aria-hidden="true"
          >
            <i />
          </span>
          <span
            className="ring-spark ring-spark-dim"
            style={
              {
                "--spark-duration": "27s",
                "--spark-delay": "-12s",
              } as React.CSSProperties
            }
            aria-hidden="true"
          >
            <i />
          </span>
        </>
      )}

      <motion.div
        className="ring-head-track"
        style={{ rotate: angle }}
        aria-hidden="true"
      >
        {settled ? null : <span className="ring-head" />}
      </motion.div>
      <div className="ring-core">
        <DotDigits value={countdown} className="relative h-[7.2vw] max-h-12 min-h-8 text-paper" />
      </div>
    </div>
  );
}
