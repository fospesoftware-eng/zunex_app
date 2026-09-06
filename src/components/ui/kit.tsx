"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Shared UI primitives — glass surfaces, glow buttons, sheets, icons.
// ---------------------------------------------------------------------------

export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass rounded-[1.75rem] hairline-top ${className}`}>{children}</div>
  );
}

export function GlowButton({
  children,
  onClick,
  disabled,
  className = "",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      className={`btn-glow ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {children}
    </motion.button>
  );
}

export function GhostButton({
  children,
  onClick,
  disabled,
  className = "",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-label={ariaLabel}
      className={`btn-ghost ${className}`}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {children}
    </motion.button>
  );
}

export function StatusPill({
  tone = "signal",
  children,
  pulse = true,
}: {
  tone?: "signal" | "mint" | "amber" | "ember" | "neutral";
  children: ReactNode;
  pulse?: boolean;
}) {
  const colors: Record<string, string> = {
    signal: "#7d97ff",
    mint: "#7dedc4",
    amber: "#ffc24d",
    ember: "#ff8a70",
    neutral: "#8b93ad",
  };
  return (
    <span className="glass-chip px-3 py-1.5 text-[0.6875rem] font-medium tracking-wide uppercase font-display">
      <span
        className="inline-block w-[7px] h-[7px] rounded-full mr-0.5"
        style={{
          background: colors[tone],
          boxShadow: `0 0 10px 1px ${colors[tone]}66`,
          animation: pulse ? "breathe 2.4s ease-in-out infinite" : undefined,
        }}
      />
      {children}
    </span>
  );
}

export function Sheet({
  open,
  onClose,
  children,
  labelledBy,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  labelledBy?: string;
}) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            className="fixed z-50 left-0 right-0 bottom-0 safe-x"
            style={{ paddingBottom: "calc(var(--safe-bottom) + 18px)" }}
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            exit={{ y: "110%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <div className="glass rounded-[1.75rem] p-5 max-w-md mx-auto hairline-top">
              <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mb-4" />
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Icons — minimal stroked set, currentColor.
// ---------------------------------------------------------------------------

export type IconName =
  | "bolt"
  | "lock"
  | "shield"
  | "chevron-left"
  | "check"
  | "close"
  | "refresh"
  | "info"
  | "timer"
  | "power"
  | "phone"
  | "card"
  | "leaf"
  | "wifi";

const PATHS: Record<IconName, ReactNode> = {
  bolt: <path d="M13 2 4.8 13.4h5.9L9.4 22l8.7-12.4h-6L13 2Z" fill="currentColor" stroke="none" />,
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
      <circle cx="12" cy="15.5" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 5.8v5.4c0 4.4 3 8.2 7 9.4 4-1.2 7-5 7-9.4V5.8L12 3Z" />
      <path d="M9.2 12.2l2 2 3.6-4" />
    </>
  ),
  "chevron-left": <path d="M14.5 5.5 8 12l6.5 6.5" />,
  check: <path d="m4.8 12.6 4.6 4.6L19.4 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  refresh: (
    <>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 3v4.5h-4.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.6" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 9.8V13l2.4 2.2M9.5 2.5h5" />
    </>
  ),
  power: (
    <>
      <path d="M12 3v8" />
      <path d="M6.6 6.6a8 8 0 1 0 10.8 0" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.8" />
      <path d="M10.8 5h1.4" />
    </>
  ),
  card: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.6" />
      <path d="M2.5 9.8h19" />
      <path d="M6.2 14.6h4" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19c0-8 4-13 15-14 1 10-3.5 15-11 15-1.4 0-2.8-.3-4-1Z" />
      <path d="M5 19c3-4.5 6-7 10-9" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.8 9.2a14 14 0 0 1 18.4 0" />
      <path d="M5.9 12.6a9.4 9.4 0 0 1 12.2 0" />
      <path d="M9 16a4.8 4.8 0 0 1 6 0" />
      <circle cx="12" cy="19.3" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
};

export function Icon({
  name,
  size = 20,
  className = "",
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
