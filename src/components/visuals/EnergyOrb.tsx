"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * EnergyOrb — glass sphere with a slow energy swirl. The welcome hero.
 */
export default function EnergyOrb({
  size = "min(62vw, 270px)",
  intensity = 1,
  active = false,
}: {
  size?: string;
  intensity?: number;
  active?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
      transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
    >
      <div className="orb-halo" style={{ opacity: intensity }} />
      <div className="orb-body">
        <div className="orb-swirl" />
        <div className="orb-swirl-inner" />
        <motion.div
          className="orb-spec"
          animate={
            reduceMotion
              ? undefined
              : { opacity: active ? [0.5, 0.9, 0.5] : [0.55, 0.8, 0.55] }
          }
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="orbit-track">
        <span className="orb-spark" />
      </div>
    </motion.div>
  );
}
