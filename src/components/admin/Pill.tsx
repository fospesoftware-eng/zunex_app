"use client";

import { HTMLAttributes } from "react";

type Variant = "success" | "warn" | "error" | "info" | "default";

const variantCls: Record<Variant, string> = {
  success: "bg-mint-400/15 text-mint-400 border-mint-400/30",
  warn: "bg-amber-400/15 text-amber-400 border-amber-400/30",
  error: "bg-ember-500/15 text-ember-400 border-ember-500/30",
  info: "bg-[#4a63ff]/15 text-[#a9bcff] border-[#4a63ff]/30",
  default: "bg-white/5 text-paper-dim border-white/15",
};

interface Props extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Pill({ variant = "default", className = "", children, ...rest }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider ${variantCls[variant]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
