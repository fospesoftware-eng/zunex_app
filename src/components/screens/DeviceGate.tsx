"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BrandWordmark } from "@/components/brand/Logo";
import { GhostButton } from "@/components/ui/kit";

// ---------------------------------------------------------------------------
// Mobile-first gate. Phones get the full experience; desktop shows a scan
// prompt with an optional development preview.
// ---------------------------------------------------------------------------

const PREVIEW_KEY = "zunex:preview";

function isDesktopLike(): boolean {
  return window.matchMedia("(min-width: 900px) and (pointer: fine)").matches;
}

export default function DeviceGate({ children }: { children: React.ReactNode }) {
  const [desktop, setDesktop] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let preview = false;
    try {
      preview = localStorage.getItem(PREVIEW_KEY) === "1";
    } catch {
      /* ignore */
    }
    setDesktop(isDesktopLike() && !preview);
    setChecked(true);
  }, []);

  const enterPreview = () => {
    try {
      localStorage.setItem(PREVIEW_KEY, "1");
    } catch {
      /* ignore */
    }
    setDesktop(false);
  };

  if (!checked) return <>{children}</>;

  if (!desktop) return <>{children}</>;

  return (
    <div className="app-viewport safe-x items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-sm flex flex-col items-center gap-8"
      >
        <BrandWordmark className="h-4 opacity-90" />
        {/* Decorative scan frame */}
        <div className="relative w-44 h-44" aria-hidden="true">
          {[
            "top-0 left-0 border-t border-l rounded-tl-2xl",
            "top-0 right-0 border-t border-r rounded-tr-2xl",
            "bottom-0 left-0 border-b border-l rounded-bl-2xl",
            "bottom-0 right-0 border-b border-r rounded-br-2xl",
          ].map((pos) => (
            <span key={pos} className={`absolute w-10 h-10 border-white/25 ${pos}`} />
          ))}
          <motion.span
            className="absolute left-3 right-3 h-px bg-gradient-to-r from-transparent via-signal-400 to-transparent"
            animate={{ top: ["12%", "86%", "12%"] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="space-y-3">
          <h1 className="font-display text-2xl font-semibold">Scan with your phone</h1>
          <p className="text-paper-dim text-sm leading-relaxed">
            This experience is designed for mobile. Point your camera at the QR
            code on any ZUNEX charging station to begin.
          </p>
        </div>
        <div className="w-64">
          <GhostButton onClick={enterPreview}>Continue in preview mode</GhostButton>
        </div>
      </motion.div>
    </div>
  );
}
