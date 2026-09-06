"use client";

import { motion } from "framer-motion";
import type { Station } from "@/lib/core/types";
import { BrandHeader } from "@/components/brand/Logo";
import ChargeBubble from "@/components/visuals/ChargeBubble";
import { Icon } from "@/components/ui/kit";

// ---------------------------------------------------------------------------
// WelcomeScreen — the object is the interface. A single floating charge
// bubble under the wordmark; tapping it splashes into the journey. Quick
// actions (WiFi · free charge) live quietly at the bottom.
// ---------------------------------------------------------------------------

const ease = [0.22, 1, 0.36, 1] as const;

export default function WelcomeScreen({
  station,
  onStart,
  onWiFi,
  onFreeCharge,
}: {
  station: Station;
  onStart: () => void;
  onWiFi: () => void;
  onFreeCharge: () => void;
}) {
  const available = station.status === "available";

  return (
    <div className="app-viewport safe-x safe-top safe-bottom">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
      >
        <BrandHeader size="h-5" />
      </motion.header>

      <main className="flex-1 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.15, ease }}
        >
          <ChargeBubble disabled={!available} onCharge={onStart} size="min(68vw, 300px)" />
        </motion.div>
      </main>

      <motion.footer
        className="quick-actions"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.45, ease }}
      >
        <button type="button" className="quick-action" onClick={onWiFi}>
          <Icon name="wifi" size={15} />
          WiFi
        </button>
        <button
          type="button"
          className="quick-action"
          onClick={onFreeCharge}
          disabled={!available}
        >
          <Icon name="bolt" size={15} />
          Free charge
        </button>
      </motion.footer>
    </div>
  );
}
