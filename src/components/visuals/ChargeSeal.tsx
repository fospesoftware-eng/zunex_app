"use client";

import { motion, useReducedMotion } from "framer-motion";

// ---------------------------------------------------------------------------
// ChargeSeal — the completion medallion. The supplied mark (plate removed)
// as premium 3D glass: pulsing inner glow, translucent face the liquid light
// shines through, extruded depth below — floating in the round liquid chamber
// under the disc's glass reflection.
// ---------------------------------------------------------------------------

const ease = [0.22, 1, 0.36, 1] as const;

export default function ChargeSeal({
  size = "min(60vw, 250px)",
}: {
  size?: string;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="seal-shell" style={{ ["--seal-size" as string]: size }}>
      <div className="seal-halo" aria-hidden="true" />
      <motion.div
        className="seal-disc"
        initial={{ scale: 0.82, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease }}
      >
        <span className="seal-liquid" aria-hidden="true" />
        <motion.div
          role="img"
          aria-label="ZUNEX mark"
          className="seal-icon"
          initial={{ scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.18, type: "spring", stiffness: 130, damping: 15 }}
        >
          <span className="seal-mark-glow" aria-hidden="true" />
          <span className="seal-mark-depth" aria-hidden="true" />
          <span className="seal-mark-face" aria-hidden="true" />
        </motion.div>
        <div className="seal-gloss" />
      </motion.div>
      <motion.span
        className="seal-ripple"
        initial={{ scale: 0.8, opacity: 0.9 }}
        animate={{ scale: 1.9, opacity: 0 }}
        transition={{ duration: 1.6, delay: 0.35, ease: "easeOut" }}
        aria-hidden="true"
      />
      {reduceMotion ? null : <span className="seal-spark" aria-hidden="true" />}
    </div>
  );
}
