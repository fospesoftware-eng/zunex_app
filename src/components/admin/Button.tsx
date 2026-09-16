"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizeCls: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
};

const variantCls: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-[#4a63ff] to-[#2447ff] text-white border border-white/20 shadow-[0_10px_30px_-10px_rgba(36,71,255,0.7)] hover:brightness-110 active:brightness-95",
  ghost:
    "bg-white/5 text-paper-dim hover:text-paper border border-white/10 hover:border-white/20 hover:bg-white/8",
  danger:
    "bg-ember-500/15 text-ember-400 border border-ember-500/30 hover:bg-ember-500/25",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${variantCls[variant]} ${sizeCls[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
});
