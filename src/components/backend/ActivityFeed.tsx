"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStoredToken } from "@/lib/client/backendAuth";

interface SessionEvent {
  id: string;
  stationId: string;
  state: string;
  planId: string;
  createdAt: number;
  paidAt?: number;
  completedAt?: number;
}

const COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  payment: {
    bg: "bg-[#2447ff]/15",
    text: "text-[#a9bcff]",
    border: "border-[#4a63ff]/30",
    label: "payment",
  },
  charging_active: {
    bg: "bg-[#7dedc4]/10",
    text: "text-[#7dedc4]",
    border: "border-[#7dedc4]/25",
    label: "charging_started",
  },
  completed: {
    bg: "bg-[#ffb020]/10",
    text: "text-[#ffb020]",
    border: "border-[#ffb020]/25",
    label: "charging_stopped",
  },
  cancelled: {
    bg: "bg-[#ff6a4d]/10",
    text: "text-[#ff6a4d]",
    border: "border-[#ff6a4d]/25",
    label: "error",
  },
};

function getEventColor(state: string) {
  if (state === "charging_active") return COLORS.charging_active;
  if (state === "completed") return COLORS.completed;
  if (state === "cancelled") return COLORS.cancelled;
  if (state === "payment_pending" || state === "paid") return COLORS.payment;
  return COLORS.payment;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s} seconds ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m !== 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function ActivityFeed() {
  const [events, setEvents] = useState<SessionEvent[]>([]);
  const [time, setTime] = useState(Date.now());

  useEffect(() => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;

    const fetchSessions = () => {
      fetch("/api/backend/sessions", { headers })
        .then((r) => r.json())
        .then((j) => {
          if (j.ok) setEvents(j.data.slice(0, 8));
        })
        .catch(() => {});
    };

    fetchSessions();
    const interval = setInterval(fetchSessions, 4000);
    const tick = setInterval(() => setTime(Date.now()), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(tick);
    };
  }, []);

  // Generate mock events if real API returns empty
  const displayEvents =
    events.length > 0
      ? events
      : generateMockEvents();

  return (
    <div className="flex flex-col h-full">
      {/* Header with live indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-[#7dedc4]"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="text-[11px] font-semibold tracking-[0.14em] text-[#a9bcff] uppercase">
            Live Activity
          </span>
        </div>
        <span className="text-[11px] text-paper-dim/50">Auto-refreshes every 4s</span>
      </div>

      {/* Event list */}
      <div className="flex-1 space-y-2 overflow-hidden">
        <AnimatePresence initial={false}>
          {displayEvents.map((ev, idx) => {
            const color = getEventColor(ev.state);
            return (
              <motion.div
                key={ev.id}
                layout
                initial={{ opacity: 0, x: 30, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: -30, height: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: idx * 0.04 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors"
              >
                {/* Color-coded pill */}
                <span
                  className={`flex-shrink-0 inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider ${color.bg} ${color.text} ${color.border} border`}
                >
                  {color.label}
                </span>

                {/* Session info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-white font-medium truncate">
                    <span className="text-[#a9bcff]">{ev.stationId}</span>
                    <span className="text-paper-dim mx-1">·</span>
                    <span className="text-paper-dim/70">{ev.id.slice(0, 10)}…</span>
                  </div>
                  <div className="text-[11px] text-paper-dim/50 mt-0.5 truncate">
                    {ev.planId}
                  </div>
                </div>

                {/* Relative time */}
                <div className="flex-shrink-0 text-[11px] text-paper-dim/50">
                  {relativeTime(ev.createdAt)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Fallback mock events
let mockIdx = 0;
function generateMockEvents(): SessionEvent[] {
  const stations = ["ZNX-PL-01", "ZNX-BA-03", "ZNX-KR-05", "ZNX-KS-02"];
  const states = ["charging_active", "payment_pending", "completed", "charging_active", "paid"];
  const plans = ["15min-10", "30min-18", "45min-25", "60min-35"];
  const now = Date.now();

  return Array.from({ length: 8 }).map((_, i) => {
    mockIdx++;
    const minsAgo = i * 2 + Math.random() * 3;
    return {
      id: `sess-${mockIdx}-${Math.random().toString(36).slice(2, 8)}`,
      stationId: stations[(mockIdx + i) % stations.length],
      state: states[(mockIdx + i) % states.length],
      planId: plans[(mockIdx + i) % plans.length],
      createdAt: now - minsAgo * 60000,
    };
  });
}
