"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Cpu,
  Wifi,
  Activity,
  LineChart,
  Map,
  FileSpreadsheet,
  Tag,
  CalendarClock,
  Building2,
  KeyRound,
  Ticket,
  ScrollText,
  Bell,
  Shield,
  FileText,
  Settings,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandWordmark, BrandSymbol } from "@/components/brand/Logo";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: "live-sessions";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "OPERATIONS",
    items: [
      { href: "/backend/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/backend/stations", label: "Stations", icon: Cpu },
      { href: "/backend/hardware", label: "Hardware", icon: Wifi },
      { href: "/backend/sessions", label: "Sessions", icon: Activity, badge: "live-sessions" },
      { href: "/backend/analytics", label: "Analytics", icon: LineChart },
      { href: "/backend/location-map", label: "Location Map", icon: Map },
      { href: "/backend/reports", label: "Reports", icon: FileSpreadsheet },
    ],
  },
  {
    label: "PLANS & PARTNERS",
    items: [
      { href: "/backend/pricing", label: "Pricing", icon: Tag },
      { href: "/backend/strategies", label: "Strategies", icon: CalendarClock },
      { href: "/backend/partners", label: "Partners", icon: Building2 },
      { href: "/backend/api-keys", label: "API Keys", icon: KeyRound },
    ],
  },
  {
    label: "SUPPORT",
    items: [
      { href: "/backend/tickets", label: "Support Tickets", icon: Ticket },
      { href: "/backend/audit-log", label: "Audit Log", icon: ScrollText },
      { href: "/backend/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { href: "/backend/admins", label: "Admin Users", icon: Shield },
      { href: "/backend/content", label: "Content", icon: FileText },
      { href: "/backend/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
  const pathname = usePathname();
  const [liveCount, setLiveCount] = useState(3);
  const [isDesktop, setIsDesktop] = useState(false);

  // Track viewport size so we only use Framer Motion transforms on mobile.
  // On desktop we rely on static Tailwind `lg:translate-x-0` — Framer Motion
  // inline transform ALWAYS wins over Tailwind classes, so we must not
  // animate `x` on desktop.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Simulated live session counter — changes every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount((c) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(1, Math.min(12, c + delta));
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Framer Motion animate — desktop forces x:0 (no transform), mobile uses
  // the slide-in toggle.
  const asideAnimate = isDesktop
    ? { x: 0 }
    : { x: open ? 0 : "-100%" };

  return (
    <>
      {/* Mobile overlay */}
      {open && !isDesktop && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <motion.aside
        initial={false}
        animate={asideAnimate}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 bottom-0 w-64 z-40 lg:translate-x-0 flex flex-col border-r border-white/5"
        style={{
          background: "linear-gradient(180deg, #0b1024 0%, #0d1430 100%)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Brand header — generous vertical padding */}
        <div className="relative pt-6 pb-5 px-5 overflow-hidden">
          {/* Navy glow blob for depth */}
          <div className="absolute -top-8 -left-4 w-44 h-44 rounded-full bg-[#2447ff]/18 blur-[48px] pointer-events-none" />
          <div className="absolute -bottom-6 -right-2 w-28 h-28 rounded-full bg-[#4a63ff]/12 blur-[36px] pointer-events-none" />

          <Link href="/backend/dashboard" className="relative flex items-center gap-3 z-10">
            {/* ZUNEX symbol */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/zunex-symbol.svg"
              alt="ZUNEX"
              className="w-9 h-9 rounded-md shadow-[0_4px_18px_-4px_rgba(36,71,255,0.6)]"
              draggable={false}
            />

            {/* Wordmark + label */}
            <div className="flex flex-col justify-center">
              <BrandWordmark className="h-5" />
              <span className="text-[10px] font-medium tracking-wider text-paper-dim/70 mt-0.5">
                Admin Console · v1.0
              </span>
            </div>
          </Link>
        </div>

        {/* Soft divider */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />

        {/* Nav — themed scrollbar */}
        <nav className="zunex-nav-scroll flex-1 px-3 pb-4 overflow-y-auto space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              <div className="px-3 mb-2 text-[10px] font-semibold tracking-[0.18em] text-paper-dim/50">
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname?.startsWith(item.href) && item.href !== "/backend";
                const isSessions = item.badge === "live-sessions";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                      isActive
                        ? "text-white bg-[rgba(36,71,255,0.12)]"
                        : "text-paper-dim hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    {/* Blue-left accent bar for active state */}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r bg-gradient-to-b from-[#4a63ff] to-[#2447ff]"
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      />
                    )}

                    {/* Icon with hover scale */}
                    <motion.div
                      animate={{ scale: isActive ? 1.08 : 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 17 }}
                      className={`flex items-center justify-center transition-all duration-200 ${
                        isActive ? "text-[#a9bcff]" : "text-paper-dim group-hover:text-white"
                      }`}
                    >
                      <Icon size={18} className="group-hover:scale-[1.08] transition-transform duration-200" />
                    </motion.div>

                    <span className="flex-1 truncate">{item.label}</span>

                    {/* Live sessions counter badge */}
                    {isSessions && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10">
                        <motion.span
                          className="w-1.5 h-1.5 rounded-full bg-[#7dedc4]"
                          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <span className="text-[11px] font-semibold text-[#a9bcff] numeral">{liveCount}</span>
                      </span>
                    )}

                    {/* Trailing chevron — fades in on hover */}
                    <ChevronRight
                      size={14}
                      className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-paper-dim/70"
                    />
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/5 text-[11px] text-paper-dim">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-[#7dedc4]"
              style={{ boxShadow: "0 0 10px rgba(125,237,196,0.8)" }}
            />
            <span className="text-paper-dim/80">
              {process.env.NODE_ENV === "development" ? "Dev mode" : "Live"} · ZUNEX v1.0
            </span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}
