"use client";

import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendPositive?: boolean;
  accent?: string; // Tailwind color class for glow
}

export function StatCard({
  label,
  value,
  trend,
  trendPositive,
  accent = "from-[#4a63ff]/40 to-[#2447ff]/10",
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative rounded-2xl border border-white/10 p-5 overflow-hidden"
      style={{
        background:
          "linear-gradient(165deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.015) 50%, rgba(255,255,255,0.04) 100%)",
        boxShadow: "0 24px 60px -30px rgba(0,0,0,0.8)",
        backdropFilter: "blur(18px)",
      }}
    >
      <div className={`pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br ${accent} blur-3xl opacity-60`} />
      <div className="relative">
        <div className="text-xs uppercase tracking-[0.18em] text-paper-dim font-medium">{label}</div>
        <div className="font-display text-3xl sm:text-4xl font-semibold text-paper mt-2 numeral tracking-tight">
          {value}
        </div>
        {trend && (
          <div
            className={`text-xs mt-2 inline-flex items-center gap-1 font-medium ${
              trendPositive ? "text-mint-400" : "text-ember-400"
            }`}
          >
            {trendPositive ? "▲" : "▼"} {trend}
          </div>
        )}
      </div>
    </motion.div>
  );
}
