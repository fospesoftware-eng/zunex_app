"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Menu,
  SlidersHorizontal,
  Search,
  Bell,
} from "lucide-react";
import { BrandSymbol } from "@/components/brand/Logo";

interface Props {
  onMenuClick: () => void;
}

function formatTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function TopBar({ onMenuClick }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-white/5"
      style={{
        background: "rgba(8,10,26,0.72)",
        backdropFilter: "blur(22px) saturate(140%)",
      }}
    >
      {/* Mobile menu */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-paper-dim hover:text-paper hover:bg-white/5 transition"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* Left zone — search + filter */}
      <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim/70" />
          <input
            placeholder="Search stations, sessions, plans…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-paper placeholder:text-paper-dim/50 focus:outline-none focus:border-[#4a63ff]/60 focus:bg-white/[0.06] transition"
          />
        </div>
        <button
          className="h-9 w-9 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/10 text-paper-dim hover:text-white hover:bg-white/[0.07] transition"
          aria-label="Filter"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      <div className="flex-1 sm:hidden" />

      {/* Right zone — live indicator, clock, notifications, profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(36,71,255,0.08)] border border-[rgba(74,99,255,0.22)]">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-[#7dedc4]"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-[10px] font-semibold tracking-[0.14em] text-[#a9bcff]">
            LIVE OPERATIONS
          </span>
        </div>

        {/* Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10">
          <span className="text-[11px] text-paper-dim/70 font-medium">UTC</span>
          <span className="text-[13px] text-paper font-semibold numeral tabular-nums">
            {formatTime(now)}
          </span>
        </div>

        {/* Notifications bell */}
        <button
          className="relative h-9 w-9 flex items-center justify-center rounded-lg bg-white/[0.04] border border-white/10 text-paper-dim hover:text-white hover:bg-white/[0.07] transition"
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ff6a4d] shadow-[0_0_8px_rgba(255,106,77,0.8)]" />
        </button>

        {/* Profile avatar with ZUNEX monogram */}
        <div className="h-9 w-9 rounded-[26.8%] overflow-hidden border border-white/15 bg-gradient-to-br from-[#1a2366] to-[#0b1430] shadow-[0_2px_12px_-4px_rgba(36,71,255,0.5)]">
          <div className="w-full h-full flex items-center justify-center">
            <BrandSymbol className="h-6 w-6" />
          </div>
        </div>
      </div>
    </header>
  );
}
