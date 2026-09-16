"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  Zap,
  Wrench,
  CircleCheck,
  Cpu,
  CreditCard,
} from "lucide-react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { Pill } from "@/components/backend/Pill";
import { Button } from "@/components/backend/Button";

type Category = "All" | "Hardware" | "Payment" | "Station" | "System";

interface Notification {
  id: number;
  category: Exclude<Category, "All">;
  title: string;
  description: string;
  source: string;
  time: string;
  icon: typeof Bell;
  borderColor: string;
  iconColor: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    category: "Hardware",
    title: "Firmware update available",
    description: "ZNX-A1 · v2.4.1 → v2.4.2 · includes MQTT reconnect fix",
    source: "station:ZNX-A1",
    time: "3 min ago",
    icon: Wrench,
    borderColor: "#a9bcff",
    iconColor: "#a9bcff",
    read: false,
  },
  {
    id: 2,
    category: "Payment",
    title: "Failed payment retried",
    description: "Session #88342 · ₹12.00 · retried successfully after 12s",
    source: "gateway:razorpay",
    time: "12 min ago",
    icon: CreditCard,
    borderColor: "#ffb020",
    iconColor: "#ffb020",
    read: false,
  },
  {
    id: 3,
    category: "Station",
    title: "ZNX-K3 went offline",
    description: "Heartbeat lost · last seen 4 min ago · check power and Wi-Fi",
    source: "station:ZNX-K3",
    time: "15 min ago",
    icon: AlertTriangle,
    borderColor: "#ff8a70",
    iconColor: "#ff8a70",
    read: false,
  },
  {
    id: 4,
    category: "System",
    title: "Daily revenue milestone",
    description: "Today's revenue crossed ₹50,000 · 62% above yesterday",
    source: "analytics",
    time: "28 min ago",
    icon: CircleCheck,
    borderColor: "#7dedc4",
    iconColor: "#7dedc4",
    read: true,
  },
  {
    id: 5,
    category: "Hardware",
    title: "High temperature warning",
    description: "ZNX-B2 · USB-C port at 63°C · threshold 65°C",
    source: "station:ZNX-B2",
    time: "42 min ago",
    icon: AlertTriangle,
    borderColor: "#ffb020",
    iconColor: "#ffb020",
    read: true,
  },
  {
    id: 6,
    category: "Station",
    title: "New session started",
    description: "ZNX-L1 · Standard plan · user +91 98765 00123",
    source: "station:ZNX-L1",
    time: "55 min ago",
    icon: Zap,
    borderColor: "#4a63ff",
    iconColor: "#4a63ff",
    read: true,
  },
  {
    id: 7,
    category: "System",
    title: "MQTT broker reconnected",
    description: "Broker mqtt.zunex.app · connection restored after 8s blip",
    source: "infra:mqtt",
    time: "1 hr ago",
    icon: Bell,
    borderColor: "#7dedc4",
    iconColor: "#7dedc4",
    read: true,
  },
  {
    id: 8,
    category: "Payment",
    title: "Refund processed",
    description: "Session #88104 · ₹30.00 refunded · user complaint ticket #2341",
    source: "gateway:razorpay",
    time: "2 hr ago",
    icon: CreditCard,
    borderColor: "#a9bcff",
    iconColor: "#a9bcff",
    read: true,
  },
];

const filters: Category[] = ["All", "Hardware", "Payment", "Station", "System"];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<Category>("All");
  const [items, setItems] = useState<Notification[]>(initialNotifications);

  const filtered = useMemo(
    () =>
      filter === "All" ? items : items.filter((n) => n.category === filter),
    [filter, items],
  );

  const unreadCount = items.filter((n) => !n.read).length;

  const markAllRead = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
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
            const Icon = n.icon;
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="relative flex items-start gap-4 px-6 py-4 border-b border-white/5 last:border-b-0 hover:bg-white/[0.025] transition"
                style={{
                  borderLeft: `3px solid ${n.borderColor}`,
                }}
              >
                {!n.read && (
                  <span
                    className="absolute top-4 right-4 w-2 h-2 rounded-full"
                    style={{ background: n.borderColor, boxShadow: `0 0 8px ${n.borderColor}` }}
                  />
                )}
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${n.borderColor}14`,
                    border: `1px solid ${n.borderColor}33`,
                  }}
                >
                  <Icon size={16} style={{ color: n.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-paper">{n.title}</span>
                    {!n.read && (
                      <span
                        className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded"
                        style={{ color: n.iconColor, background: `${n.borderColor}1a` }}
                      >
                        new
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-paper-dim">{n.description}</div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] font-mono text-paper-dim/60">{n.source}</span>
                    <span className="text-[11px] text-paper-dim/60">·</span>
                    <span className="text-[11px] text-paper-dim">{n.time}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="px-6 py-12 text-center text-paper-dim text-sm">
            No notifications in this category
          </div>
        )}
      </GlassCard>
    </div>
  );
}
