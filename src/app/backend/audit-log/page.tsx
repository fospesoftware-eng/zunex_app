"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  LogIn,
  Settings,
  Ticket,
  Cpu,
  Tag,
  Shield,
  UserPlus,
  CreditCard,
  Activity,
  ListMusic,
  KeyRound,
} from "lucide-react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { Pill } from "@/components/backend/Pill";
import { useToast } from "@/components/backend/Toast";
import { getAccessToken } from "@/lib/client/backendAuth";

interface AuditRow {
  id: number;
  actor: string | null;
  action: string;
  description: string | null;
  target: string | null;
  created_at: string;
}

type PillVariant = "success" | "warn" | "error" | "info" | "default";

interface ActionStyle {
  icon: typeof LogIn;
  color: string;
  variant: PillVariant;
}

function actionStyle(action: string): ActionStyle {
  if (action === "login") return { icon: LogIn, color: "#7dedc4", variant: "success" };
  if (action === "config-change") return { icon: Settings, color: "#a9bcff", variant: "default" };
  if (action.startsWith("ticket-")) return { icon: Ticket, color: "#ffb020", variant: "warn" };
  if (action === "station-offline") return { icon: Activity, color: "#ff8a70", variant: "error" };
  if (action.startsWith("station-")) return { icon: Cpu, color: "#4a63ff", variant: "info" };
  if (action.startsWith("hardware-")) return { icon: Cpu, color: "#ffb020", variant: "warn" };
  if (action === "plan-updated") return { icon: Tag, color: "#ffb020", variant: "warn" };
  if (action.startsWith("strategy-")) return { icon: Settings, color: "#a9bcff", variant: "default" };
  if (action.startsWith("partner-")) return { icon: UserPlus, color: "#7dedc4", variant: "success" };
  if (action.startsWith("user-")) return { icon: UserPlus, color: "#4a63ff", variant: "info" };
  if (action === "apikey-revoked") return { icon: KeyRound, color: "#ff8a70", variant: "error" };
  if (action.startsWith("apikey-")) return { icon: Shield, color: "#7dedc4", variant: "success" };
  if (action.startsWith("media-") || action.startsWith("playlist-")) return { icon: ListMusic, color: "#a9bcff", variant: "default" };
  if (action === "payment") return { icon: CreditCard, color: "#7dedc4", variant: "success" };
  return { icon: Activity, color: "#a9bcff", variant: "default" };
}

function fmtTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return `Today · ${time}`;
  if (sameDay(d, yesterday)) return `Yesterday · ${time}`;
  return `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${time}`;
}

const filterActions = [
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
  const [entries, setEntries] = useState<AuditRow[]>([]);
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const headers: Record<string, string> = {};
      const token = await getAccessToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/backend/audit", { headers });
      const j = await res.json();
      if (j.ok) setEntries(j.data as AuditRow[]);
      else toast.show("error", j.message ?? "Failed to load audit log");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      filter === "all" ? entries : entries.filter((e) => e.action === filter),
    [filter, entries],
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
            const style = actionStyle(entry.action);
            const Icon = style.icon;
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
                    background: style.color,
                    boxShadow: `0 0 12px ${style.color}`,
                  }}
                />

                <GlassCard>
                  <div className="flex items-start gap-4">
                    <div
                      className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        background: `${style.color}14`,
                        border: `1px solid ${style.color}33`,
                      }}
                    >
                      <Icon size={16} style={{ color: style.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-paper capitalize">
                          {entry.action.replace(/-/g, " ")}
                        </span>
                        {entry.target && (
                          <Pill variant={style.variant}>
                            {entry.target}
                          </Pill>
                        )}
                        <span className="text-[11px] text-paper-dim ml-auto">
                          {fmtTimestamp(entry.created_at)}
                        </span>
                      </div>
                      {entry.description && (
                        <div className="text-sm text-paper-dim">{entry.description}</div>
                      )}
                      <div className="text-[11px] text-paper-dim/60 mt-1">
                        Actor: <span className="font-mono">{entry.actor ?? "system"}</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <GlassCard>
            <div className="py-8 text-center text-sm text-paper-dim">
              No audit entries yet
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
