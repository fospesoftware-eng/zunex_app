"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  value?: number;
  onChange?: (v: number) => void;
}

export function RealTimeBadge({ value: initialValue, onChange }: Props) {
  const [value, setValue] = useState(initialValue ?? 3);

  useEffect(() => {
    if (initialValue !== undefined) setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!onChange) return;
    const id = setInterval(() => {
      const delta = Math.floor(Math.random() * 5) - 2;
      setValue((v) => {
        const next = Math.max(1, Math.min(15, v + delta));
        onChange(next);
        return next;
      });
    }, 5000);
    return () => clearInterval(id);
  }, [onChange]);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(36,71,255,0.08)] border border-[rgba(74,99,255,0.22)]">
      <motion.span
        className="w-2 h-2 rounded-full bg-[#7dedc4]"
        style={{ boxShadow: "0 0 10px rgba(125,237,196,0.7)" }}
        animate={{ scale: [1, 1.35, 1], opacity: [1, 0.45, 1] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className="text-[10px] font-semibold tracking-[0.14em] text-[#a9bcff] uppercase">
        LIVE SESSIONS
      </span>
      <motion.span
        key={value}
        initial={{ scale: 1.2, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="text-[12px] font-bold text-white numeral tabular-nums"
      >
        {value}
      </motion.span>
    </div>
  );
}
