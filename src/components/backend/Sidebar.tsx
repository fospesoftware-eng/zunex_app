"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Cpu,
  Tag,
  CalendarClock,
  Users,
  Building2,
  Shield,
  FileText,
  Settings,
  History,
  Ticket,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/backend/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/backend/stations", label: "Stations", icon: Cpu },
  { href: "/backend/hardware", label: "Hardware", icon: Cpu },
  { href: "/backend/sessions", label: "Sessions", icon: History },
  { href: "/backend/pricing", label: "Pricing", icon: Tag },
  { href: "/backend/strategies", label: "Strategies", icon: CalendarClock },
  { href: "/backend/partners", label: "Partners", icon: Building2 },
  { href: "/backend/admins", label: "Admin users", icon: Shield },
  { href: "/backend/content", label: "Content", icon: FileText },
  { href: "/backend/tickets", label: "Support tickets", icon: Ticket },
  { href: "/backend/settings", label: "Settings", icon: Settings },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : "-100%" }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 bottom-0 w-64 z-40 lg:translate-x-0 flex flex-col border-r border-white/10"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,10,26,0.98) 0%, rgba(5,6,16,0.98) 100%)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Wordmark */}
        <div className="px-6 py-5 border-b border-white/10">
          <Link href="/backend/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4a63ff] to-[#2447ff] flex items-center justify-center font-display font-bold text-white shadow-[0_8px_20px_-6px_rgba(36,71,255,0.7)]">
              Z
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-paper">
              ZUNEX <span className="text-paper-dim/80">admin</span>
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href) && item.href !== "/backend";
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white/[0.07] text-paper"
                    : "text-paper-dim hover:text-paper hover:bg-white/[0.04]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-gradient-to-b from-[#4a63ff] to-[#2447ff]"
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <Icon size={18} className={isActive ? "text-[#a9bcff]" : ""} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10 text-[11px] text-paper-dim">
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-mint-400 shadow-[0_0_10px_rgba(125,237,196,0.8)]" />
            <span>{process.env.NODE_ENV === "development" ? "Dev mode" : "Live"}</span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
