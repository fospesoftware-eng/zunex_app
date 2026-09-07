"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { playTap } from "@/lib/client/sound";

// ---------------------------------------------------------------------------
// ChargeBubble — the tap-to-charge hero. A floating glass sphere holding the
// ZUNEX mark. The object itself is the action: on tap it compresses, bursts
// into light and droplets, and carries the guest into the journey.
// ---------------------------------------------------------------------------

const ease = [0.22, 1, 0.36, 1] as const;

const DROPLETS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2 + (i % 3) * 0.24;
  const dist = 110 + (i % 4) * 30;
  return {
    x: Math.cos(a) * dist,
    y: Math.sin(a) * dist,
    size: 4 + (i % 4) * 2,
    delay: (i % 4) * 0.03,
  };
});

export default function ChargeBubble({
  size = "min(62vw, 270px)",
  disabled = false,
  caption = "Tap to charge",
  onCharge,
}: {
  size?: string;
  disabled?: boolean;
  caption?: string;
  onCharge: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [bursting, setBursting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const tap = useCallback(() => {
    if (disabled || bursting) return;
    playTap();
    if (reduceMotion) {
      onCharge();
      return;
    }
    setBursting(true);
    timer.current = setTimeout(onCharge, 760);
  }, [disabled, bursting, reduceMotion, onCharge]);

  return (
    <div className="flex flex-col items-center gap-7">
      <motion.button
        type="button"
        className="bubble-stage"
        style={{ ["--bubble-size" as string]: size }}
        onClick={tap}
        disabled={disabled || bursting}
        aria-label={disabled ? "Station unavailable" : caption}
        animate={bursting ? undefined : { y: [0, -10, 0] }}
        transition={bursting ? undefined : { duration: 6, ease: "easeInOut", repeat: Infinity }}
        whileTap={disabled || bursting ? undefined : { scale: 0.95 }}
      >
        <div className="bubble-halo" style={{ opacity: disabled ? 0.35 : 1 }} aria-hidden="true" />
        <motion.div
          className="bubble-body"
          animate={
            bursting
              ? { scale: [1, 0.9, 1.16, 1.05], opacity: [1, 1, 1, 0] }
              : undefined
          }
          transition={
            bursting
              ? { duration: 0.7, times: [0, 0.3, 0.72, 1], ease }
              : undefined
          }
        >
          <div className="bubble-swirl" aria-hidden="true" />
          <div className="bubble-swirl-inner" aria-hidden="true" />
          <div className="bubble-spec" aria-hidden="true" />
        </motion.div>

        {bursting && (
          <>
            <motion.span
              className="bubble-flare"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.25, 1.9] }}
              transition={{ duration: 0.75, ease: "easeOut" }}
              aria-hidden="true"
            />
            {[0, 1].map((i) => (
              <motion.span
                key={i}
                className="bubble-splash-ring"
                initial={{ scale: 0.55, opacity: 0.9 }}
                animate={{ scale: 2.6 + i * 0.7, opacity: 0 }}
                transition={{ duration: 0.85, delay: i * 0.12, ease: "easeOut" }}
                aria-hidden="true"
              />
            ))}
            {DROPLETS.map((d, i) => (
              <motion.span
                key={i}
                className="bubble-droplet"
                style={{
                  width: d.size,
                  height: d.size,
                  marginLeft: -d.size / 2,
                  marginTop: -d.size / 2,
                }}
                initial={{ x: 0, y: 0, opacity: 0.95, scale: 1 }}
                animate={{ x: d.x, y: d.y, opacity: 0, scale: 0.25 }}
                transition={{
                  duration: 0.7 + (i % 3) * 0.08,
                  delay: d.delay,
                  ease: "easeOut",
                }}
                aria-hidden="true"
              />
            ))}
          </>
        )}
      </motion.button>

      <motion.p
        className={`font-display text-[0.75rem] tracking-[0.34em] uppercase ${
          disabled ? "text-paper-dim/50" : "text-paper-dim hint-breath"
        }`}
        animate={bursting ? { opacity: 0 } : undefined}
      >
        {disabled ? "Station unavailable" : caption}
      </motion.p>
    </div>
  );
}
