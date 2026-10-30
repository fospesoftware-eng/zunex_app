"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Zap,
  Wrench,
  CreditCard,
} from "lucide-react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { Button } from "@/components/backend/Button";
import { useToast } from "@/components/backend/Toast";
import { getAccessToken } from "@/lib/client/backendAuth";

type Category = "All" | "Hardware" | "Payment" | "Station" | "System";
type NotifCategory = Exclude<Category, "All">;

interface NotificationRow {
  id: string;
  category: NotifCategory;
  title: string;
  description: string | null;
  source: string | null;
  read: boolean;
  created_at: number;
}

const categoryStyle: Record<NotifCategory, { icon: typeof Bell; borderColor: string; iconColor: string }> = {
  Hardware: { icon: Wrench, borderColor: "#a9bcff", iconColor: "#a9bcff" },
  Payment: { icon: CreditCard, borderColor: "#ffb020", iconColor: "#ffb020" },
  Station: { icon: Zap, borderColor: "#4a63ff", iconColor: "#4a63ff" },
  System: { icon: Bell, borderColor: "#7dedc4", iconColor: "#7dedc4" },
};

const filters: Category[] = ["All", "Hardware", "Payment", "Station", "System"];

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString();
}

async function authHeaders(json = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (json) headers["content-type"] = "application/json";
  const token = await getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<Category>("All");
  const [items, setItems] = useState<NotificationRow[]>([]);
  const toast = useToast();

  const load = async () => {
    const res = await fetch("/api/backend/notifications", { headers: await authHeaders() });
    const j = await res.json();
    if (j.ok) setItems(j.data as NotificationRow[]);
    else toast.show("error", j.message ?? "Failed to load notifications");
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      filter === "All" ? items : items.filter((n) => n.category === filter),
    [filter, items],
  );

  const unreadCount = items.filter((n) => !n.read).length;

  const markRead = async (n: NotificationRow) => {
    if (n.read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    const res = await fetch(`/api/backend/notifications/${n.id}`, {
      method: "PATCH",
      headers: await authHeaders(true),
      body: JSON.stringify({ read: true }),
    });
    const j = await res.json();
    if (!j.ok) {
      toast.show("error", j.message ?? "Failed to mark as read");
      load();
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    const res = await fetch("/api/backend/notifications", {
      method: "PATCH",
      headers: await authHeaders(true),
      body: JSON.stringify({ all: true }),
    });
    const j = await res.json();
    if (!j.ok) {
      toast.show("error", j.message ?? "Failed to mark all as read");
      load();
    }
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread · real-time alerts from every system`}
        actions={
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            Mark all as read
          </Button>
        }
      />

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider transition ${
              filter === f
                ? "bg-[#4a63ff]/20 text-[#a9bcff] border-[#4a63ff]/40"
                : "bg-white/5 text-paper-dim border-white/10 hover:border-white/20 hover:text-paper"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <GlassCard className="!p-0 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {filtered.map((n) => {
            const style = categoryStyle[n.category] ?? categoryStyle.System;
            const Icon = style.icon;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => markRead(n)}
                className="relative flex items-start gap-4 px-6 py-4 border-b border-white/5 last:border-b-0 hover:bg-white/[0.025] transition cursor-pointer"
                style={{
                  borderLeft: `3px solid ${style.borderColor}`,
                }}
              >
                {!n.read && (
                  <span
                    className="absolute top-4 right-4 w-2 h-2 rounded-full"
                    style={{ background: style.borderColor, boxShadow: `0 0 8px ${style.borderColor}` }}
                  />
                )}
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${style.borderColor}14`,
                    border: `1px solid ${style.borderColor}33`,
                  }}
                >
                  <Icon size={16} style={{ color: style.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-paper">{n.title}</span>
                    {!n.read && (
                      <span
                        className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded"
                        style={{ color: style.iconColor, background: `${style.borderColor}1a` }}
                      >
                        new
                      </span>
                    )}
                  </div>
                  {n.description && (
                    <div className="text-sm text-paper-dim">{n.description}</div>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    {n.source && (
                      <>
                        <span className="text-[11px] font-mono text-paper-dim/60">{n.source}</span>
                        <span className="text-[11px] text-paper-dim/60">·</span>
                      </>
                    )}
                    <span className="text-[11px] text-paper-dim">{relTime(n.created_at)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center text-paper-dim text-sm">
            No notifications
          </div>
        )}
      </GlassCard>
    </div>
  );
}
