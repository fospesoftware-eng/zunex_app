"use client";

import { HTMLAttributes } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
}

export function GlassCard({ title, subtitle, className = "", children, ...rest }: Props) {
  return (
    <div
      className={`relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-white/[0.05] backdrop-blur-xl shadow-[0_30px_70px_-30px_rgba(0,0,0,0.85)] overflow-hidden ${className}`}
      {...rest}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/[0.06]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="relative p-6">
        {(title || subtitle) && (
          <div className="mb-5">
            {title && (
              <h3 className="font-display text-lg font-semibold text-paper tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && <p className="text-sm text-paper-dim mt-1">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
