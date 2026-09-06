"use client";

import { motion } from "framer-motion";
import type { SessionSnapshot } from "@/lib/core/types";
import { formatClock } from "@/lib/core/format";
import { BrandHeader } from "@/components/brand/Logo";
import ChargeSeal from "@/components/visuals/ChargeSeal";
import { GlowButton } from "@/components/ui/kit";

// ---------------------------------------------------------------------------
// CompleteScreen — the energy settles into the ZUNEX seal. A calm, branded,
// satisfying resolution. Stats read as typeset hairlines, not boxes.
// ---------------------------------------------------------------------------

const ease = [0.22, 1, 0.36, 1] as const;

export default function CompleteScreen({
  snapshot,
  stationName,
  onDone,
}: {
  snapshot: SessionSnapshot;
  stationName?: string;
  onDone: () => void;
}) {
  const plan = snapshot.plan;
  const watts = snapshot.charging?.watts ?? 30;
  const energyWh = plan ? Math.round(((watts * plan.minutes) / 60) * 10) / 10 : 0;
  const endedAt = snapshot.completedAt ?? Date.now();

  return (
    <div className="app-viewport safe-x safe-top safe-bottom overflow-hidden">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
        className="pb-6"
      >
        <BrandHeader />
      </motion.header>

      <main className="flex-1 flex flex-col items-center justify-center gap-4">
        <ChargeSeal size="min(56vw, 28vh, 234px)" />

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease }}
        >
          <p className="eyebrow mb-2.5">Session complete</p>
          <h1 className="font-display text-[1.9rem] font-semibold leading-tight">
            Fully charged.
          </h1>
        </motion.div>

        <motion.dl
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease }}
        >
          {[
            ["Station", stationName ?? "Zunex"],
            ["Duration", plan ? `${plan.minutes} minutes` : "—"],
            ["Energy delivered", `${energyWh} Wh`],
            ["Average power", `${watts} W`],
            ["Ended at", formatClock(endedAt)],
          ].map(([label, value], i) => (
            <div
              key={label}
              className={`stat-row ${i > 0 ? "border-t border-white/6" : ""}`}
            >
              <dt className="text-paper-dim text-sm">{label}</dt>
              <dd className="numeral text-sm font-medium">{value}</dd>
            </div>
          ))}
        </motion.dl>
      </main>

      <motion.footer
        className="pt-3 flex flex-col gap-3 max-w-sm w-full mx-auto"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease }}
      >
        <GlowButton className="btn-seal" onClick={onDone}>
          Finish
        </GlowButton>
      </motion.footer>
    </div>
  );
}
