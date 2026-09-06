"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BrandHeader } from "@/components/brand/Logo";
import { Icon } from "@/components/ui/kit";

// ---------------------------------------------------------------------------
// Mobile-only gate. Phones get the full experience; desktop (non-localhost)
// sees an error card. Localhost is always whitelisted so the dev machine can
// preview freely.
// ---------------------------------------------------------------------------

const PREVIEW_KEY = "zunex:preview";

function isLocalhost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "";
}

function isDesktopLike(): boolean {
  return window.matchMedia("(min-width: 900px) and (pointer: fine)").matches;
}

export default function DeviceGate({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Localhost is always whitelisted — the dev machine can preview freely.
    if (isLocalhost()) {
      setChecked(true);
      return;
    }
    let preview = false;
    try {
      preview = localStorage.getItem(PREVIEW_KEY) === "1";
    } catch {
      /* ignore */
    }
    setBlocked(isDesktopLike() && !preview);
    setChecked(true);
  }, []);

  // Developer escape hatch: triple-click the logo to enter preview mode.
  const onLogoTripleClick = () => {
    try {
      localStorage.setItem(PREVIEW_KEY, "1");
    } catch {
      /* ignore */
    }
    setBlocked(false);
  };

  if (!checked) return <>{children}</>;
  if (!blocked) return <>{children}</>;

  return (
    <div className="app-viewport safe-x safe-top safe-bottom">
      {/* Animated wordmark at the top */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="logo-breathe"
        onDoubleClick={onLogoTripleClick}
        title=""
      >
        <BrandHeader />
      </motion.div>

      {/* Error orb — dead-centre */}
      <main className="flex-1 grid place-items-center py-6">
        <motion.div
          className="error-orb"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 140, damping: 14 }}
          aria-hidden="true"
        >
          <Icon name="phone" size={34} className="text-ember-400 error-orb-icon" />
        </motion.div>
      </main>

      {/* Error card message */}
      <motion.footer
        className="flex flex-col items-center gap-6 text-center max-w-sm w-full mx-auto pb-2"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl px-6 py-7 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.9)]">
          <h1 className="font-display text-[1.4rem] font-semibold leading-snug text-paper">
            Sorry, this only works on Mobile
          </h1>
          <p className="text-paper-dim text-sm leading-relaxed mt-3">
            Please open this page on your phone to start charging. The ZUNEX
            experience is designed for mobile devices only.
          </p>
        </div>
      </motion.footer>
    </div>
  );
}
