"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car,
  Building2,
  ShoppingBag,
  Mountain,
  Navigation,
  Building,
  MapPin,
  Wifi as WifiIcon,
} from "lucide-react";
import { PageHeader } from "@/components/backend/PageHeader";
import { GlassCard } from "@/components/backend/GlassCard";
import { Pill } from "@/components/backend/Pill";
import { IndiaMap, type StationMapPoint } from "@/components/backend/IndiaMap";
import { gpsToSvg } from "@/lib/core/gps";

type LiveStatus = "available" | "busy" | "offline";
type DeviceModel = "core" | "plus";
type InstallType = "car" | "mall" | "retail" | "outdoor" | "highway" | "office";

interface StationRow {
  id: string;
  name: string;
  location: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
  deviceModel: DeviceModel;
  installType: InstallType;
  liveStatus: LiveStatus;
  connectionStatus: "online" | "offline" | "connecting" | "unknown";
  firmwareVersion: string;
  lastSeenAt: number | null;
}

const installIcon: Record<InstallType, typeof Car> = {
  car: Car,
  mall: Building2,
  retail: ShoppingBag,
  outdoor: Mountain,
  highway: Navigation,
  office: Building,
};

const installLabel: Record<InstallType, string> = {
  car: "Car",
  mall: "Mall",
  retail: "Retail",
  outdoor: "Outdoor",
  highway: "Highway",
  office: "Office",
};

const modelPillBg: Record<DeviceModel, string> = {
  core: "bg-[#4a63ff] text-white border-[#4a63ff]",
  plus: "bg-[#a855f7] text-white border-[#a855f7]",
};

// Fallback hard-coded 15 stations — used if API fetch fails
const FALLBACK: StationRow[] = [
  { id: "ZNX-A1", name: "Zunex Gateway", location: "Gateway Mall — Level 2", city: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777, deviceModel: "plus", installType: "mall", liveStatus: "busy", connectionStatus: "online", firmwareVersion: "v2.4.1", lastSeenAt: Date.now() - 2000 },
  { id: "ZNX-A2", name: "Zunex BKC Hub", location: "Bandra Kurla Complex", city: "Mumbai", state: "Maharashtra", lat: 19.0596, lng: 72.8425, deviceModel: "plus", installType: "office", liveStatus: "available", connectionStatus: "online", firmwareVersion: "v2.4.1", lastSeenAt: Date.now() - 3000 },
  { id: "ZNX-B2", name: "ZUNEX B2", location: "MG Road Store — Ground Floor", city: "Bangalore", state: "Karnataka", lat: 12.9716, lng: 77.5946, deviceModel: "core", installType: "retail", liveStatus: "available", connectionStatus: "online", firmwareVersion: "v2.3.0", lastSeenAt: Date.now() - 1500 },
  { id: "ZNX-B3", name: "Zunex Whitefield", location: "Phoenix MarketCity Mall", city: "Bangalore", state: "Karnataka", lat: 12.9873, lng: 77.6409, deviceModel: "plus", installType: "mall", liveStatus: "busy", connectionStatus: "connecting", firmwareVersion: "v2.4.1", lastSeenAt: Date.now() - 8000 },
  { id: "ZNX-L1", name: "ZUNEX L1", location: "NH8 Rest Stop — Highway", city: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090, deviceModel: "plus", installType: "highway", liveStatus: "available", connectionStatus: "online", firmwareVersion: "v2.4.1", lastSeenAt: Date.now() - 1800 },
  { id: "ZNX-D2", name: "Zunex Connaught", location: "Connaught Place Charging Hub", city: "Delhi", state: "Delhi", lat: 28.6328, lng: 77.2182, deviceModel: "core", installType: "outdoor", liveStatus: "available", connectionStatus: "online", firmwareVersion: "v2.3.0", lastSeenAt: Date.now() - 2500 },
  { id: "ZNX-K3", name: "ZUNEX K3", location: "Chennai Tech Park — Office Bay", city: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707, deviceModel: "core", installType: "office", liveStatus: "available", connectionStatus: "online", firmwareVersion: "v2.3.0", lastSeenAt: Date.now() - 1200 },
  { id: "ZNX-K4", name: "Zunex OMR", location: "Sholinganallur — IT Corridor", city: "Chennai", state: "Tamil Nadu", lat: 12.8844, lng: 80.2257, deviceModel: "plus", installType: "highway", liveStatus: "offline", connectionStatus: "offline", firmwareVersion: "v2.4.0", lastSeenAt: null },
  { id: "ZNX-M1", name: "ZUNEX M1", location: "Hyundai Service Centre", city: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867, deviceModel: "plus", installType: "car", liveStatus: "busy", connectionStatus: "online", firmwareVersion: "v2.4.1", lastSeenAt: Date.now() - 1600 },
  { id: "ZNX-H2", name: "Zunex Gachibowli", location: "Financial District Towers", city: "Hyderabad", state: "Telangana", lat: 17.4432, lng: 78.3520, deviceModel: "core", installType: "office", liveStatus: "available", connectionStatus: "online", firmwareVersion: "v2.3.0", lastSeenAt: Date.now() - 2200 },
  { id: "ZNX-C1", name: "ZUNEX C1", location: "Park Street Charging Hub", city: "Kolkata", state: "West Bengal", lat: 22.5726, lng: 88.3639, deviceModel: "core", installType: "outdoor", liveStatus: "available", connectionStatus: "online", firmwareVersion: "v2.3.0", lastSeenAt: Date.now() - 3000 },
  { id: "ZNX-C2", name: "Zunex Salt Lake", location: "Techno City Sector V", city: "Kolkata", state: "West Bengal", lat: 22.5958, lng: 88.4549, deviceModel: "plus", installType: "office", liveStatus: "available", connectionStatus: "online", firmwareVersion: "v2.4.1", lastSeenAt: Date.now() - 1900 },
  { id: "ZNX-P1", name: "ZUNEX P1", location: "SG Highway Mall", city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, deviceModel: "plus", installType: "mall", liveStatus: "available", connectionStatus: "online", firmwareVersion: "v2.4.1", lastSeenAt: Date.now() - 2400 },
  { id: "ZNX-P2", name: "Zunex Sindhu Bhavan", location: "SG Highway Service Road", city: "Ahmedabad", state: "Gujarat", lat: 23.0316, lng: 72.5550, deviceModel: "core", installType: "car", liveStatus: "available", connectionStatus: "online", firmwareVersion: "v2.3.0", lastSeenAt: Date.now() - 3500 },
  { id: "ZNX-J1", name: "ZUNEX J1", location: "Cuffe Parade Outpost", city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, deviceModel: "core", installType: "outdoor", liveStatus: "available", connectionStatus: "online", firmwareVersion: "v2.3.0", lastSeenAt: Date.now() - 2800 },
];

type FilterKey = "all" | DeviceModel | InstallType;
const FILTERS: FilterKey[] = ["all", "core", "plus", "car", "mall", "retail", "outdoor", "highway", "office"];

export default function LocationMapPage() {
  const [stations, setStations] = useState<StationRow[]>(FALLBACK);
  const [filter, setFilter] = useState<FilterKey[]>(["all"]);

  const load = async () => {
    try {
      const res = await fetch("/api/backend/stations");
      if (!res.ok) throw new Error("bad status");
      const j = await res.json();
      if (!j.ok || !Array.isArray(j.data)) throw new Error("bad payload");
      // Build a hardware lookup
      let hwMap: Record<string, { connectionStatus: string; firmwareVersion: string; lastSeenAt: number | null }> = {};
      try {
        const hwRes = await fetch("/api/backend/hardware");
        const hwJ = await hwRes.json();
        if (hwJ.ok && Array.isArray(hwJ.data)) {
          for (const h of hwJ.data) {
            hwMap[h.stationId] = { connectionStatus: h.connectionStatus, firmwareVersion: h.firmwareVersion, lastSeenAt: h.lastSeenAt };
          }
        }
      } catch { /* ignore hw fetch */ }
      const merged: StationRow[] = j.data.map((s: any) => {
        const hw = hwMap[s.id.toUpperCase()];
        return {
          id: s.id.toUpperCase(),
          name: s.name,
          location: s.location,
          city: s.city ?? "",
          state: s.state ?? "",
          lat: s.lat ?? 0,
          lng: s.lng ?? 0,
          deviceModel: s.deviceModel ?? "core",
          installType: s.installType ?? "office",
          liveStatus: (s.liveStatus ?? s.baseStatus ?? "available") as LiveStatus,
          connectionStatus: (hw?.connectionStatus ?? "unknown") as StationRow["connectionStatus"],
          firmwareVersion: hw?.firmwareVersion ?? "—",
          lastSeenAt: hw?.lastSeenAt ?? null,
        };
      });
      if (merged.length) setStations(merged);
    } catch {
      // keep fallback
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter.includes("all")) return stations;
    return stations.filter((s) => filter.includes(s.deviceModel as FilterKey) || filter.includes(s.installType as FilterKey));
  }, [stations, filter]);

  const mapPins: StationMapPoint[] = useMemo(() => filtered.map((s) => {
    const { x, y } = gpsToSvg(s.lat, s.lng);
    return {
      x, y,
      name: s.name,
      city: s.city,
      status: s.liveStatus,
      deviceModel: s.deviceModel,
      installType: s.installType,
      stationId: s.id,
    };
  }), [filtered]);

  const stats = useMemo(() => {
    const online = stations.filter((s) => s.connectionStatus === "online").length;
    const busy = stations.filter((s) => s.liveStatus === "busy").length;
    const offline = stations.filter((s) => s.liveStatus === "offline").length;
    return { total: stations.length, online, busy, offline };
  }, [stations]);

  function toggleFilter(k: FilterKey) {
    if (k === "all") { setFilter(["all"]); return; }
    setFilter((prev) => {
      const withoutAll = prev.filter((p) => p !== "all");
      if (withoutAll.includes(k)) {
        const next = withoutAll.filter((p) => p !== k);
        return next.length ? next : ["all"];
      }
      return [...withoutAll, k];
    });
  }

  const sortedStations = useMemo(() => {
    const order: Record<LiveStatus, number> = { available: 0, busy: 1, offline: 2 };
    return [...filtered].sort((a, b) => order[a.liveStatus] - order[b.liveStatus]);
  }, [filtered]);

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Location Map"
        subtitle="Every ZUNEX station across India — live status and hardware configuration."
      />

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-paper-dim mr-2">Filter:</span>
        {FILTERS.map((f) => {
          const active = f === "all" ? filter.includes("all") : filter.includes(f);
          return (
            <button
              key={f}
              onClick={() => toggleFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                active
                  ? "bg-[#4a63ff]/20 border-[#4a63ff]/50 text-[#a9bcff]"
                  : "bg-white/[0.03] border-white/10 text-paper-dim hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          );
        })}
      </div>

      {/* 2/3 + 1/3 layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAP LEFT (2/3) */}
        <div className="lg:col-span-2 relative">
          <div className="relative">
            <IndiaMap stations={mapPins} />
            {/* Legend top-right */}
            <div className="absolute top-4 right-4 z-20 bg-[rgba(10,15,34,0.88)] border border-white/15 backdrop-blur-xl rounded-xl px-4 py-3 space-y-2.5 text-xs">
              <div className="text-[10px] uppercase tracking-wider text-paper-dim font-semibold mb-1">Status</div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#7dedc4]" />
                <span className="text-paper">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#fbbf24]" />
                <span className="text-paper">Busy</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[#f87171]" />
                <span className="text-paper">Offline</span>
              </div>
              <div className="h-px bg-white/10 my-1" />
              <div className="text-[10px] uppercase tracking-wider text-paper-dim font-semibold mb-1">Device</div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-1.5 py-0.5 rounded bg-[#4a63ff] text-white text-[9px] font-bold">Core</span>
                <span className="text-paper">1-port basic</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-1.5 py-0.5 rounded bg-[#a855f7] text-white text-[9px] font-bold">Plus</span>
                <span className="text-paper">2-port premium</span>
              </div>
            </div>
            {/* Stats bottom-left */}
            <div className="absolute bottom-4 right-4 z-20 bg-[rgba(10,15,34,0.88)] border border-white/15 backdrop-blur-xl rounded-xl px-3 py-2 text-[11px] text-paper-dim flex items-center gap-3">
              <span>{stats.total} stations</span>
              <span className="text-[#7dedc4]">· {stats.online} online</span>
              <span className="text-[#fbbf24]">· {stats.busy} busy</span>
              <span className="text-[#f87171]">· {stats.offline} offline</span>
            </div>
          </div>
        </div>

        {/* STATION LIST RIGHT (1/3) */}
        <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
          <AnimatePresence>
            {sortedStations.map((s, i) => {
              const Ic = installIcon[s.installType];
              const statusVariant: Record<LiveStatus, "success" | "warn" | "error"> = {
                available: "success", busy: "warn", offline: "error",
              };
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ scale: 1.01 }}
                  className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-white/[0.05] backdrop-blur-xl p-4 transition-all duration-200 hover:border-[#4a63ff]/40 hover:shadow-[0_0_40px_-10px_rgba(36,71,255,0.4)]"
                >
                  {/* Top row: name + status */}
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="font-display text-[13px] font-semibold text-paper">{s.name}</h3>
                      <div className="text-[10px] font-mono text-paper-dim/60">{s.id}</div>
                    </div>
                    <Pill variant={statusVariant[s.liveStatus]}>{s.liveStatus}</Pill>
                  </div>
                  {/* City row */}
                  <div className="flex items-center gap-1 text-[11px] text-paper-dim mb-2">
                    <MapPin size={11} />
                    {s.city}{s.state ? `, ${s.state}` : ""}
                  </div>
                  {/* Model + Install */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${modelPillBg[s.deviceModel]}`}>
                      {s.deviceModel}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-paper-dim">
                      <Ic size={12} />
                      {installLabel[s.installType]}
                    </span>
                  </div>
                  {/* MQTT + firmware */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      {s.connectionStatus === "online" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#7dedc4]">
                          <WifiIcon size={10} /> MQTT connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#f87171]">
                          <WifiIcon size={10} /> disconnected
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-paper-dim/60">{s.firmwareVersion}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {!sortedStations.length && (
            <div className="text-center text-paper-dim text-sm py-8">No stations match this filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}
