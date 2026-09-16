"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Wifi, WifiOff, MapPin, Cable } from "lucide-react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { Pill } from "@/components/backend/Pill";

type Status = "online" | "busy" | "offline";

interface Station {
  name: string;
  id: string;
  location: string;
  deviceId: string;
  status: Status;
  connector: string;
  powerWatts: number;
  lastSeen: string;
  mqttOnline: boolean;
  sessionTime?: string;
  sessionPlan?: string;
}

const initialStations: Station[] = [
  {
    name: "ZUNEX One",
    id: "ZNX-A1",
    location: "Cafe Aurora · MG Road",
    deviceId: "DEV-A1-2847",
    status: "busy",
    connector: "USB-C",
    powerWatts: 30,
    lastSeen: "2 sec ago",
    mqttOnline: true,
    sessionTime: "14 min",
    sessionPlan: "Standard",
  },
  {
    name: "ZUNEX B2",
    id: "ZNX-B2",
    location: "Bookstore · Church St",
    deviceId: "DEV-B2-1933",
    status: "online",
    connector: "USB-C",
    powerWatts: 45,
    lastSeen: "12 sec ago",
    mqttOnline: true,
  },
  {
    name: "ZUNEX L1",
    id: "ZNX-L1",
    location: "Library · Residency Rd",
    deviceId: "DEV-L1-0842",
    status: "online",
    connector: "Lightning",
    powerWatts: 20,
    lastSeen: "1 min ago",
    mqttOnline: true,
  },
  {
    name: "ZUNEX K3",
    id: "ZNX-K3",
    location: "Coworking · Indiranagar",
    deviceId: "DEV-K3-5501",
    status: "offline",
    connector: "USB-C",
    powerWatts: 30,
    lastSeen: "3 min ago",
    mqttOnline: false,
  },
];

const statusPill: Record<Status, { variant: "success" | "warn" | "error"; label: string }> = {
  online: { variant: "success", label: "Online" },
  busy: { variant: "warn", label: "Busy" },
  offline: { variant: "error", label: "Offline" },
};

export default function DeviceMapPage() {
  const [stations, setStations] = useState<Station[]>(initialStations);

  // Simple auto-refresh — simulate telemetry tick
  useEffect(() => {
    const interval = setInterval(() => {
      setStations((prev) =>
        prev.map((s) => {
          if (s.status === "busy" && s.sessionTime) {
            const mins = parseInt(s.sessionTime) + 1;
            return { ...s, sessionTime: `${mins} min`, lastSeen: "just now" };
          }
          return s;
        }),
      );
      // Keep page alive — not a full reload so animations don't reset
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const onlineCount = stations.filter((s) => s.status !== "offline").length;
  const busyCount = stations.filter((s) => s.status === "busy").length;
  const offlineCount = stations.filter((s) => s.status === "offline").length;

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Device Map"
        subtitle="Live view of every station on the network."
      />

      {/* Header summary line */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-paper-dim">Status:</span>
        <div className="flex items-center gap-2">
          <Pill variant="info">{stations.length} stations</Pill>
          <Pill variant="success">{onlineCount} online</Pill>
          <Pill variant="warn">{busyCount} busy</Pill>
          <Pill variant="error">{offlineCount} offline</Pill>
        </div>
      </div>

      {/* Station grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {stations.map((s) => {
          const pill = statusPill[s.status];
          return (
            <GlassCard key={s.id} className="hover:border-white/20 transition">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display text-base font-semibold text-paper">
                      {s.name}
                    </h3>
                    <span className="text-[11px] font-mono text-paper-dim bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                      {s.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-paper-dim">
                    <MapPin size={12} />
                    {s.location}
                  </div>
                </div>
                <Pill variant={pill.variant as "success" | "warn" | "error"}>
                  {pill.label}
                </Pill>
              </div>

              {/* Connector row */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2">
                  <Cpu size={14} className="text-signal-400" />
                  <span className="text-xs text-paper-dim">{s.connector}</span>
                  <span className="text-[10px] text-paper-dim/50">·</span>
                  <span className="text-xs text-paper-dim numeral">{s.powerWatts}W</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Cable size={13} className="text-paper-dim/70" />
                  <span className="text-[11px] font-mono text-paper-dim">{s.deviceId}</span>
                </div>
              </div>

              {/* Current session info if busy */}
              {s.status === "busy" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="rounded-xl bg-amber-500/[0.07] border border-amber-400/20 px-4 py-3 mb-4"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 mb-1.5">
                    Active session
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-paper">{s.sessionPlan} plan</div>
                      <div className="text-xs text-paper-dim">Phone · +91 98765 43210</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-amber-400 numeral">{s.sessionTime}</div>
                      <div className="text-[10px] text-paper-dim uppercase tracking-wider">elapsed</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Connection status row */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                  {s.mqttOnline ? (
                    <Pill variant="success">
                      <Wifi size={10} />
                      MQTT
                    </Pill>
                  ) : (
                    <Pill variant="error">
                      <WifiOff size={10} />
                      MQTT
                    </Pill>
                  )}
                </div>
                <motion.span
                  className="text-[11px] text-paper-dim numeral"
                  animate={s.status === "online" ? { opacity: [1, 0.5, 1] } : {}}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  {s.lastSeen}
                </motion.span>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
