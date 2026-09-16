"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  SlidersHorizontal,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  Shield,
  Settings,
} from "lucide-react";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Click outside closes dropdown
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const handleLogout = () => {
    try {
      localStorage.removeItem("zunex_admin_token");
    } catch { /* ignore */ }
    setMenuOpen(false);
    window.location.href = "/backend";
  };

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

      {/* Right zone — live indicator, clock, notifications, ZUNEX symbol (logout) */}
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

        {/* ZUNEX symbol dropdown — logout button (symbol only) */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-1.5 h-9 px-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.07] hover:border-white/20 transition group"
            aria-label="Account menu"
          >
            {/* ZUNEX symbol svg only — no wordmark */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/zunex-symbol.svg"
              alt="ZUNEX"
              className="h-7 w-7 rounded-md shadow-[0_2px_10px_-2px_rgba(36,71,255,0.5)]"
              draggable={false}
            />
            <ChevronDown
              size={14}
              className={`text-paper-dim transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown menu — glass card */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-white/10 p-2 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.8)] z-50"
                style={{
                  background: "linear-gradient(180deg, rgba(14,18,44,0.98) 0%, rgba(8,10,26,0.98) 100%)",
                  backdropFilter: "blur(20px)",
                }}
              >
                {/* Header — current session */}
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/zunex-symbol.svg"
                      alt=""
                      className="h-7 w-7 rounded-md"
                      draggable={false}
                    />
                    <div>
                      <div className="text-[13px] text-white font-semibold">ZUNEX Admin</div>
                      <div className="text-[10px] text-paper-dim/70">super_admin · dev mode</div>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-paper-dim hover:text-white hover:bg-white/[0.05] transition"
                >
                  <Shield size={15} />
                  Admin profile
                </button>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-paper-dim hover:text-white hover:bg-white/[0.05] transition"
                >
                  <Settings size={15} />
                  Preferences
                </button>

                <div className="h-px bg-white/5 my-1" />

                {/* Logout — primary action */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-[#ff6a4d] hover:bg-[#ff6a4d]/10 transition"
                >
                  <LogOut size={15} />
                  Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
