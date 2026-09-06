"use client";

import { motion } from "framer-motion";
import type { FriendlyError } from "@/lib/core/types";
import { BrandHeader } from "@/components/brand/Logo";
import { GhostButton, GlowButton, Icon } from "@/components/ui/kit";

const ease = [0.22, 1, 0.36, 1] as const;

export interface ErrorAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export default function ErrorScreen({
  error,
  actions,
}: {
  error: FriendlyError;
  actions: ErrorAction[];
}) {
  return (
    <div className="app-viewport safe-x safe-top safe-bottom">
      {/* Animated wordmark — pinned to the top of the screen */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="logo-breathe"
      >
        <BrandHeader />
      </motion.div>

      {/* Power orb — the animated centrepiece, dead-centre of the screen */}
      <main className="flex-1 grid place-items-center py-6">
        <motion.div
          className="error-orb"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 140, damping: 14 }}
          aria-hidden="true"
        >
          <Icon name="power" size={34} className="text-ember-400 error-orb-icon" />
        </motion.div>
      </main>

      {/* Message + actions */}
      <motion.footer
        className="flex flex-col items-center gap-6 text-center max-w-sm w-full mx-auto pb-2"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.25, ease }}
      >
        <div className="space-y-3">
          <h1 className="font-display text-[1.55rem] font-semibold leading-snug">
            {error.title}
          </h1>
          <p className="text-paper-dim text-sm leading-relaxed">{error.message}</p>
        </div>

        <div className="w-full flex flex-col gap-3">
          {actions.map((action) =>
            action.primary ? (
              <GlowButton key={action.label} onClick={action.onClick}>
                {action.label}
              </GlowButton>
            ) : (
              <GhostButton key={action.label} onClick={action.onClick}>
                {action.label}
              </GhostButton>
            ),
          )}
        </div>
      </motion.footer>
    </div>
  );
}
