"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LogIn,
  Settings,
  Ticket,
  Cpu,
  Tag,
  Shield,
  Trash2,
  UserPlus,
  CreditCard,
  Activity,
} from "lucide-react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { Pill } from "@/components/backend/Pill";

type ActionType =
  | "login"
  | "config-change"
  | "ticket-resolved"
  | "station-started"
  | "plan-updated"
  | "user-created"
  | "payment"
  | "station-offline";

interface AuditEntry {
  id: number;
  timestamp: string;
  isoTime: string;
  action: ActionType;
  actor: string;
  description: string;
  target: string;
  icon: typeof LogIn;
  color: string;
  variant: "default" | "success" | "warn" | "error" | "info";
}

type PillVariant = "success" | "warn" | "error" | "info" | "default";

const entries: AuditEntry[] = [
  {
    id: 1,
    timestamp: "Today · 14:32",
    isoTime: "2026-09-16T14:32:00Z",
    action: "login",
    actor: "admin@zunex.app",
    description: "Admin logged in from Chrome on macOS",
    target: "auth",
    icon: LogIn,
    color: "#7dedc4",
    variant: "success",
  },
  {
    id: 2,
    timestamp: "Today · 13:58",
    isoTime: "2026-09-16T13:58:00Z",
    action: "ticket-resolved",
    actor: "support.ram",
    description: "Resolved refund request · user charged twice for session",
    target: "ticket #2341",
    icon: Ticket,
    color: "#ffb020",
    variant: "warn",
  },
  {
    id: 3,
    timestamp: "Today · 12:15",
    isoTime: "2026-09-16T12:15:00Z",
    action: "station-started",
    actor: "system",
    description: "ZNX-L1 started session #88356 · 20min Standard plan",
    target: "station:ZNX-L1",
    icon: Cpu,
    color: "#4a63ff",
    variant: "info",
  },
  {
    id: 4,
    timestamp: "Today · 11:42",
    isoTime: "2026-09-16T11:42:00Z",
    action: "config-change",
    actor: "admin@zunex.app",
    description: "Updated price · Standard plan ₹0.75/min → ₹0.80/min",
    target: "plans",
    icon: Settings,
    color: "#a9bcff",
    variant: "default",
  },
  {
    id: 5,
    timestamp: "Today · 10:08",
    isoTime: "2026-09-16T10:08:00Z",
    action: "payment",
    actor: "system",
    description: "Processed batch settlement · ₹142,500 settled to 3 partners",
    target: "gateway:razorpay",
    icon: CreditCard,
    color: "#7dedc4",
    variant: "success",
  },
  {
    id: 6,
    timestamp: "Yesterday · 22:14",
    isoTime: "2026-09-15T22:14:00Z",
    action: "station-offline",
    actor: "system",
    description: "ZNX-K3 heartbeat lost · offline state set automatically",
    target: "station:ZNX-K3",
    icon: Activity,
    color: "#ff8a70",
    variant: "error",
  },
  {
    id: 7,
    timestamp: "Yesterday · 18:55",
    isoTime: "2026-09-15T18:55:00Z",
    action: "plan-updated",
    actor: "admin@zunex.app",
    description: "Created new plan · Premium · ₹1.50/min · priority queue",
    target: "plans",
    icon: Tag,
    color: "#ffb020",
    variant: "warn",
  },
  {
    id: 8,
    timestamp: "Yesterday · 16:30",
    isoTime: "2026-09-15T16:30:00Z",
    action: "user-created",
    actor: "admin@zunex.app",
    description: "Invited new support staff · aisha@zunex.app",
    target: "admins",
    icon: UserPlus,
    color: "#4a63ff",
    variant: "info",
  },
  {
    id: 9,
    timestamp: "Yesterday · 09:22",
    isoTime: "2026-09-15T09:22:00Z",
    action: "config-change",
    actor: "admin@zunex.app",
    description: "Rotated API keys · deleted 2 old keys",
    target: "security",
    icon: Shield,
    color: "#ff8a70",
    variant: "error",
  },
  {
    id: 10,
    timestamp: "2 days ago · 20:05",
    isoTime: "2026-09-14T20:05:00Z",
    action: "station-started",
    actor: "system",
    description: "ZNX-A1 started session #87921 · 15min Quick plan",
    target: "station:ZNX-A1",
    icon: Cpu,
    color: "#4a63ff",
    variant: "info",
  },
];

const filterActions: ("all" | ActionType)[] = [
  "all",
  "login",
  "config-change",
  "ticket-resolved",
  "station-started",
  "plan-updated",
  "payment",
];

export default function AuditLogPage() {
  const [filter, setFilter] = useState<(typeof filterActions)[number]>("all");

  const filtered = useMemo(
    () =>
      filter === "all" ? entries : entries.filter((e) => e.action === filter),
    [filter],
  );

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle="Every critical action across the platform · immutable history."
      />

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {filterActions.map((a) => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider transition ${
              filter === a
                ? "bg-[#4a63ff]/20 text-[#a9bcff] border-[#4a63ff]/40"
                : "bg-white/5 text-paper-dim border-white/10 hover:border-white/20 hover:text-paper"
            }`}
          >
            {a.replace(/-/g, " ")}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative pl-8">
        {/* Vertical blue line */}
        <div className="absolute left-[18px] top-0 bottom-0 w-px bg-gradient-to-b from-[#4a63ff] via-[#2447ff] to-transparent" />

        <div className="space-y-5">
          {filtered.map((entry, idx) => {
            const Icon = entry.icon;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  duration: 0.4,
                  delay: idx * 0.06,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="relative"
              >
                {/* Dot on the line */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 15,
                    delay: idx * 0.06 + 0.15,
                  }}
                  className="absolute -left-[26px] top-5 w-4 h-4 rounded-full border-2 border-[#0d1120] z-10"
                  style={{
                    background: entry.color,
                    boxShadow: `0 0 12px ${entry.color}`,
                  }}
                />

                <GlassCard>
                  <div className="flex items-start gap-4">
                    <div
                      className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${entry.color}14`,
                        border: `1px solid ${entry.color}33`,
                      }}
                    >
                      <Icon size={16} style={{ color: entry.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-paper capitalize">
                          {entry.action.replace(/-/g, " ")}
                        </span>
                        <Pill variant={entry.variant as PillVariant}>
                          {entry.target}
                        </Pill>
                        <span className="text-[11px] text-paper-dim ml-auto">
                          {entry.timestamp}
                        </span>
                      </div>
                      <div className="text-sm text-paper-dim">{entry.description}</div>
                      <div className="text-[11px] text-paper-dim/60 mt-1">
                        Actor: <span className="font-mono">{entry.actor}</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
