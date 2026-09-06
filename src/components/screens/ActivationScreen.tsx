"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SessionState } from "@/lib/core/types";
import EnergyOrb from "@/components/visuals/EnergyOrb";

// ---------------------------------------------------------------------------
// ActivationScreen — the transition ritual from "paid" to "power flowing".
// Stage 1: payment verified → energy unlock burst.
// Stage 2: starting → handshake with the physical station.
// Advances automatically as server state flips to charging_active.
// ---------------------------------------------------------------------------

const ease = [0.22, 1, 0.36, 1] as const;

export default function ActivationScreen({ state }: { state: Extract<SessionState, "payment_successful" | "starting"> }) {
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    setBurstKey((k) => k + 1);
  }, [state]);

  const verified = state === "payment_successful";

  return (
    <div className="app-viewport safe-x items-center justify-center overflow-hidden">
      {/* Energy unlock burst */}
      <AnimatePresence>
        {verified && (
          <motion.div
            key={burstKey}
            className="fixed inset-0 pointer-events-none z-10"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-hidden="true"
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(50% 40% at 50% 46%, rgba(157,180,255,0.5), transparent 70%)",
              }}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.15, 1.5] }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute left-1/2 top-[46%] w-40 h-40 -ml-20 -mt-20 rounded-full border"
                style={{ borderColor: "rgba(157,180,255,0.5)" }}
                initial={{ scale: 0.4, opacity: 0.8 }}
                animate={{ scale: 3.4, opacity: 0 }}
                transition={{ duration: 1.6, delay: i * 0.22, ease: "easeOut" }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col items-center gap-10">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease }}
        >
          <EnergyOrb size="min(56vw, 240px)" intensity={verified ? 1.25 : 1} active />
        </motion.div>

        <div className="h-24 flex flex-col items-center gap-3 text-center">
          <AnimatePresence mode="wait">
            {verified ? (
              <motion.div
                key="verified"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease }}
                className="flex flex-col items-center gap-3"
              >
                <p className="eyebrow">Payment verified</p>
                <h1 className="font-display text-[1.9rem] font-semibold leading-tight">
                  Energy unlocked
                </h1>
              </motion.div>
            ) : (
              <motion.div
                key="starting"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease }}
                className="flex flex-col items-center gap-3"
              >
                <p className="eyebrow">Secure handshake</p>
                <h1 className="font-display text-[1.9rem] font-semibold leading-tight">
                  Waking the station
                </h1>
                <div className="flex items-center gap-2 mt-1" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-signal-300"
                      animate={{ opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
