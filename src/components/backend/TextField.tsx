"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const TextField = forwardRef<HTMLInputElement, Props>(function TextField(
  { label, className = "", ...rest },
  ref,
) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">{label}</span>}
      <input
        ref={ref}
        className={`h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper placeholder:text-paper-dim/50 focus:outline-none focus:border-[#4a63ff] focus:ring-2 focus:ring-[#4a63ff]/25 transition ${className}`}
        {...rest}
      />
    </label>
  );
});
