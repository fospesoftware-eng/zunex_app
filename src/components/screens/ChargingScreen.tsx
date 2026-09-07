"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ConnectionQuality } from "@/lib/client/useSessionSync";
import type { SessionSnapshot } from "@/lib/core/types";
import { formatCountdown } from "@/lib/core/format";
import { BrandHeader, BrandSymbol } from "@/components/brand/Logo";
import EnergyRing from "@/components/visuals/EnergyRing";
import InstallPrompt from "@/components/visuals/InstallPrompt";

// ---------------------------------------------------------------------------
// ChargingScreen — the hero. A glass energy torus with a server-anchored
// countdown, a full-bleed telemetry readout and realtime link status.
// ---------------------------------------------------------------------------

const ease = [0.22, 1, 0.36, 1] as const;

function useJitter(base: number, active: boolean): number {
  const [watts, setWatts] = useState(base);
  useEffect(() => {
    if (!active) return;
    setWatts(base);
    const t = setInterval(() => {
      setWatts(Math.max(4, Math.round(base + (Math.random() - 0.5) * base * 0.14)));
    }, 2000);
    return () => clearInterval(t);
  }, [base, active]);
  return watts;
}

export default function ChargingScreen({
  snapshot,
  remainingMs,
  connection,
}: {
  snapshot: SessionSnapshot;
  remainingMs: number;
  connection: ConnectionQuality;
}) {
  const charging = snapshot.charging;
  const totalMs = snapshot.plan ? snapshot.plan.minutes * 60_000 : 0;
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : 0;
  const stopping = snapshot.state === "stopping";
  const watts = useJitter(charging?.watts ?? 30, snapshot.state === "charging_active");
  const elapsedMs = Math.max(0, totalMs - remainingMs);
  const energyWh = Math.round(((watts * elapsedMs) / 3_600_000) * 10) / 10;

  const countdown = formatCountdown(remainingMs);

  return (
    <div className="app-viewport safe-x safe-top safe-bottom">
      {/* Header — the wordmark, nothing else */}
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <BrandHeader />
      </motion.header>

      {/* Offline banner */}
      <AnimatePresence>
        {connection === "offline" && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="mt-4 rounded-2xl px-4 py-3 flex items-center gap-3 text-sm"
              style={{
                background: "rgba(255,176,32,0.09)",
                border: "1px solid rgba(255,194,77,0.28)",
              }}
              role="status"
            >
              <span className="pulse-dot" style={{ ["--pulse-color" as string]: "#ffc24d" }} />
              <span className="text-amber-300 font-display text-xs tracking-wide">
                Connection interrupted — your session keeps running. Reconnecting…
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero ring */}
      <main className="flex-1 flex flex-col items-center justify-center gap-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease }}
          style={{ ["--ring-size" as string]: "min(78vw, 320px)" }}
        >
          <EnergyRing progress={progress} countdown={countdown} settled={stopping} />
        </motion.div>

        {/* Telemetry — a floating liquid-glass instrument capsule */}
        <motion.div
          className="telemetry-strip w-full"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease }}
        >
          {[
            { label: "Power", value: `${watts}`, unit: "W" },
            { label: "Delivered", value: `${energyWh}`, unit: "Wh" },
            { label: "Progress", value: `${Math.round(progress * 100)}`, unit: "%" },
          ].map((stat) => (
            <div key={stat.label} className="telemetry-cell">
              <p className="eyebrow !text-[0.5625rem] !tracking-[0.2em]">{stat.label}</p>
              <p className="numeral mt-1.5 text-xl font-medium">
                {stat.value}
                <span className="text-paper-dim text-xs ml-0.5">{stat.unit}</span>
              </p>
            </div>
          ))}
        </motion.div>
      </main>

      {/* Footer — small breathing ZUNEX mark in a liquid-glass disc */}
      <motion.footer
        className="charge-foot"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.45, ease }}
        aria-hidden="true"
      >
        <div className="charge-foot-disc">
          <span className="charge-foot-mark" />
        </div>
      </motion.footer>

      {/* Install nudge — only while actively charging, 15s after the
          charge timer starts (and never inside an installed PWA). */}
      {snapshot.state === "charging_active" && <InstallPrompt delayMs={15000} />}
    </div>
  );
}
