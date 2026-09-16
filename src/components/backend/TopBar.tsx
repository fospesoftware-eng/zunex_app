"use client";

import { Menu, RefreshCw, Search, User } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: Props) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-white/10"
      style={{
        background: "rgba(8,10,26,0.7)",
        backdropFilter: "blur(18px)",
      }}
    >
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-paper-dim hover:text-paper hover:bg-white/5 transition"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md">
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-paper-dim" />
          <input
            placeholder="Search…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.05] border border-white/10 text-sm text-paper placeholder:text-paper-dim/50 focus:outline-none focus:border-[#4a63ff] transition"
          />
        </div>
      </div>

      <div className="flex-1 sm:hidden" />

      <button
        onClick={() => router.refresh()}
        className="p-2 rounded-lg text-paper-dim hover:text-paper hover:bg-white/5 transition"
        aria-label="Refresh"
      >
        <RefreshCw size={18} />
      </button>

      <div className="flex items-center gap-2 pl-3 border-l border-white/10">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4a63ff] to-[#2447ff] flex items-center justify-center">
          <User size={16} className="text-white" />
        </div>
      </div>
    </header>
  );
}
