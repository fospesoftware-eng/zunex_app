"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: string;
  trendPositive?: boolean;
  icon: LucideIcon;
  iconBgFrom?: string;
  iconBgTo?: string;
  delay?: number;
}

export function AnimatedStatCard({
  label,
  value,
  prefix = "",
  suffix = "",
  trend,
  trendPositive = true,
  icon: Icon,
  iconBgFrom = "from-[#4a63ff]/40",
  iconBgTo = "to-[#2447ff]/10",
  delay = 0,
}: Props) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.2,
      delay,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [value, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-[1.25rem] p-5 transition-all duration-300"
      style={{
        background: "linear-gradient(145deg, rgba(36,71,255,0.12), rgba(11,16,36,0.9))",
        border: "1px solid rgba(125,151,255,0.18)",
        boxShadow: "0 8px 32px -12px rgba(36,71,255,0.3)",
      }}
      whileHover={{
        borderColor: "rgba(125,151,255,0.4)",
        boxShadow: "0 10px 40px -12px rgba(36,71,255,0.5)",
      }}
    >
      {/* Inner glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: "radial-gradient(circle at 20% 0%, rgba(74,99,255,0.15), transparent 60%)",
        }}
      />

      <div className="relative flex items-start gap-4">
        {/* Icon chip */}
        <div
          className={`flex-shrink-0 h-11 w-11 rounded-[14px] flex items-center justify-center bg-gradient-to-br ${iconBgFrom} ${iconBgTo} border border-white/10 shadow-[0_4px_14px_-4px_rgba(36,71,255,0.6)]`}
        >
          <Icon size={20} className="text-[#a9bcff]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-paper-dim/70 uppercase mb-1">
            {label}
          </div>
          <div className="font-display text-[28px] font-semibold text-white tracking-tight leading-none">
            {prefix}
            <motion.span className="numeral tabular-nums">{rounded}</motion.span>
            {suffix && <span className="text-[14px] font-medium text-paper-dim ml-1">{suffix}</span>}
          </div>
          {trend && (
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  trendPositive
                    ? "bg-[#7dedc4]/10 text-[#7dedc4] border border-[#7dedc4]/25"
                    : "bg-[#ffb020]/10 text-[#ffb020] border border-[#ffb020]/25"
                }`}
              >
                {trendPositive ? "▲" : "▼"} {trend.replace(/^[+-]/, "")}
              </span>
              <span className="text-[11px] text-paper-dim/60">vs yesterday</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
