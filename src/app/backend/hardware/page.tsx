"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  RefreshCw,
  Zap,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Wifi as WifiIcon,
  WifiOff,
  Bluetooth,
  Server,
  Cpu,
  Activity,
  Settings2,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/backend/PageHeader";
import { GlassCard } from "@/components/backend/GlassCard";
import { Button } from "@/components/backend/Button";
import { Pill } from "@/components/backend/Pill";
import { Modal } from "@/components/backend/Modal";
import { TextField } from "@/components/backend/TextField";
import { NumberField } from "@/components/backend/NumberField";
import { useToast } from "@/components/backend/Toast";
import { getStoredToken } from "@/lib/client/backendAuth";

type ConnectionStatus = "online" | "offline" | "connecting" | "unknown";
type DeviceModel = "core" | "plus";
type InstallType = "car" | "mall" | "retail" | "outdoor" | "highway" | "office";

interface HardwareRow {
  id: string;
  stationId: string;
  deviceId: string;
  brokerUrl: string;
  mqttTopic: string;
  mqttPort: number;
  username: string;
  password: string;
  firmwareVersion: string;
  heartbeatIntervalMs: number;
  lastSeenAt: number | null;
  connectionStatus: ConnectionStatus;
  telemetryEnabled: boolean;
  updatedAt: number;
  deviceModel: DeviceModel;
  installType: InstallType;
  city: string;
  lat: number;
  lng: number;
}

function getHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers["x-zunex-admin-token"] = token;
  return headers;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = getStoredToken();
  if (token) headers["x-zunex-admin-token"] = token;
  return headers;
}

function fmtLastSeen(ts: number | null) {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  if (diff < 5000) return "Just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return new Date(ts).toLocaleString();
}

const modelBg: Record<DeviceModel, string> = {
  core: "bg-[#4a63ff]/20 text-[#a9bcff] border-[#4a63ff]/40",
  plus: "bg-[#a855f7]/20 text-[#d8b4fe] border-[#a855f7]/40",
};

const installLabel: Record<InstallType, string> = {
  car: "Car", mall: "Mall", retail: "Retail", outdoor: "Outdoor", highway: "Highway", office: "Office",
};

export default function HardwareConfigPage() {
  const [devices, setDevices] = useState<HardwareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDevice, setEditDevice] = useState<HardwareRow | null>(null);
  const toast = useToast();

  const load = async () => {
    try {
      const res = await fetch("/api/backend/hardware", { headers: getHeaders() });
      const j = await res.json();
      if (j.ok) setDevices(j.data ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const triggerHeartbeat = async () => {
    const res = await fetch("/api/backend/hardware/heartbeat", { method: "POST", headers: getHeaders() });
    const j = await res.json();
    if (j.ok) {
      setDevices(j.data ?? []);
      toast.show("success", "Heartbeat simulated");
    } else toast.show("error", j.message ?? "Heartbeat failed");
  };

  const onlineCount = devices.filter((d) => d.connectionStatus === "online").length;
  const offlineCount = devices.filter((d) => d.connectionStatus === "offline").length;

  return (
    <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title="Hardware Configuration"
        subtitle="Device-level settings — MQTT broker, firmware, heartbeat intervals"
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#4a63ff]/15 border border-[#4a63ff]/30 text-[11px] text-[#a9bcff] font-medium uppercase tracking-wider">
              <Cpu size={11} /> Device Engineering
            </span>
            <Button variant="ghost" size="md" onClick={load}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button variant="ghost" size="md" onClick={triggerHeartbeat}>
              <Zap size={14} /> Simulate heartbeat
            </Button>
          </>
        }
      />

      {/* Summary stats */}
      <div className="flex items-center gap-3 mb-6">
        <Pill variant="info">{devices.length} devices</Pill>
        <Pill variant="success">{onlineCount} connected</Pill>
        <Pill variant="error">{offlineCount} disconnected</Pill>
      </div>

      {/* Cards grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {devices.map((d) => {
          const isOnline = d.connectionStatus === "online";
          return (
            <GlassCard key={d.id} className="hover:border-[#4a63ff]/30 transition-all duration-200">
              {/* Identity header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1a2366] to-[#0b1430] border border-white/10 flex items-center justify-center">
                      <Cpu size={16} className="text-[#a9bcff]" />
                    </div>
                    <div>
                      <div className="text-[11px] font-mono text-paper-dim/70">{d.deviceId}</div>
                      <Link href={`/backend/stations`} className="text-[10px] font-mono text-[#a9bcff] hover:underline">
                        Station {d.stationId}
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${modelBg[d.deviceModel]}`}>
                    {d.deviceModel}
                  </span>
                  {installLabel[d.installType] && (
                    <span className="text-[10px] text-paper-dim px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                      {installLabel[d.installType]}
                    </span>
                  )}
                </div>
              </div>

              {/* MQTT section */}
              <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2.5 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-paper-dim font-semibold">
                    <Server size={11} /> MQTT Broker
                  </div>
                  {isOnline ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#7dedc4]">
                      <CheckCircle2 size={10} /> Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#f87171]">
                      <AlertCircle size={10} /> {d.connectionStatus}
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-paper-dim break-all">
                  {d.brokerUrl}:{d.mqttPort}
                </div>
                <div className="text-[10px] font-mono text-paper-dim/70 break-all mt-0.5">
                  {d.mqttTopic}
                </div>
              </div>

              {/* Firmware */}
              <div className="flex items-center justify-between mb-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-paper-dim font-semibold mb-0.5">Firmware</div>
                  <div className="font-mono text-paper">{d.firmwareVersion}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-paper-dim font-semibold mb-0.5">Last seen</div>
                  <div className="text-paper-dim">{fmtLastSeen(d.lastSeenAt)}</div>
                </div>
              </div>

              {/* Telemetry */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Activity size={13} className="text-paper-dim/70" />
                  <span className="text-xs text-paper-dim">Telemetry</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] ${d.telemetryEnabled ? "text-[#7dedc4]" : "text-paper-dim/50"}`}>
                    {d.telemetryEnabled ? "Enabled" : "Disabled"}
                  </span>
                  <span className="text-[10px] font-mono text-paper-dim/60">
                    {d.heartbeatIntervalMs}ms
                  </span>
                </div>
              </div>

              {/* Location */}
              {d.city && (
                <div className="flex items-center gap-1.5 text-[10px] text-paper-dim/60 mb-3">
                  <MapPin size={10} />
                  {d.city} · {d.lat.toFixed(3)}, {d.lng.toFixed(3)}
                </div>
              )}

              {/* Action row */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5">
                  {isOnline ? (
                    <motion.span
                      className="inline-flex items-center gap-1 text-[10px] text-[#7dedc4]"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <WifiIcon size={11} /> Connected
                    </motion.span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#f87171]">
                      <WifiOff size={11} /> Disconnected
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setEditDevice(d)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-paper-dim hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition"
                >
                  <Settings2 size={11} /> Configure
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {loading && !devices.length && (
        <div className="text-center text-paper-dim text-sm py-12">Loading hardware configs…</div>
      )}
      {!loading && !devices.length && (
        <div className="text-center text-paper-dim text-sm py-12">No hardware configs yet.</div>
      )}

      {/* Edit Modal */}
      <Modal open={!!editDevice} onClose={() => setEditDevice(null)} title="Device Configuration">
        {editDevice && (
          <HardwareForm
            initial={editDevice}
            onSaved={() => { setEditDevice(null); load(); }}
            onClose={() => setEditDevice(null)}
          />
        )}
      </Modal>
    </motion.div>
  );
}

interface HardwareFormProps {
  initial: HardwareRow;
  onSaved: () => void;
  onClose: () => void;
}

function HardwareForm({ initial, onSaved, onClose }: HardwareFormProps) {
  const [stationId, setStationId] = useState(initial.stationId);
  const [deviceId, setDeviceId] = useState(initial.deviceId);
  const [brokerUrl, setBrokerUrl] = useState(initial.brokerUrl);
  const [mqttTopic, setMqttTopic] = useState(initial.mqttTopic);
  const [mqttPort, setMqttPort] = useState<number>(initial.mqttPort);
  const [username, setUsername] = useState(initial.username);
  const [password, setPassword] = useState(initial.password);
  const [showPw, setShowPw] = useState(false);
  const [firmwareVersion, setFirmwareVersion] = useState(initial.firmwareVersion);
  const [heartbeatIntervalMs, setHeartbeatIntervalMs] = useState<number>(initial.heartbeatIntervalMs);
  const [telemetryEnabled, setTelemetryEnabled] = useState<boolean>(initial.telemetryEnabled);
  const [deviceModel, setDeviceModel] = useState<DeviceModel>(initial.deviceModel);
  const [installType, setInstallType] = useState<InstallType>(initial.installType);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationId || !deviceId) { toast.show("error", "Station and device ID are required"); return; }
    const body = {
      stationId, deviceId, brokerUrl, mqttTopic, mqttPort, username, password,
      firmwareVersion, heartbeatIntervalMs, telemetryEnabled, deviceModel, installType,
    };
    const res = await fetch(`/api/backend/hardware/${initial.id}`, {
      method: "PATCH", headers: authHeaders(), body: JSON.stringify(body),
    });
    const j = await res.json();
    if (j.ok) { toast.show("success", "Device config updated"); onSaved(); }
    else toast.show("error", j.message ?? "Failed to save");
  };

  return (
    <form onSubmit={save} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Station ID" value={stationId} onChange={(e) => setStationId(e.target.value)} required />
        <TextField label="Device ID" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Device Model</span>
          <select
            value={deviceModel}
            onChange={(e) => setDeviceModel(e.target.value as DeviceModel)}
            className="h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper focus:outline-none focus:border-[#4a63ff] focus:ring-2 focus:ring-[#4a63ff]/25"
          >
            <option value="core">Core (1-port basic)</option>
            <option value="plus">Plus (2-port premium)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Install Type</span>
          <select
            value={installType}
            onChange={(e) => setInstallType(e.target.value as InstallType)}
            className="h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper focus:outline-none focus:border-[#4a63ff] focus:ring-2 focus:ring-[#4a63ff]/25"
          >
            <option value="car">Car</option>
            <option value="mall">Mall</option>
            <option value="retail">Retail</option>
            <option value="outdoor">Outdoor</option>
            <option value="highway">Highway</option>
            <option value="office">Office</option>
          </select>
        </label>
      </div>
      <div className="h-px bg-white/10" />
      <TextField label="Broker URL" value={brokerUrl} onChange={(e) => setBrokerUrl(e.target.value)} />
      <div className="grid grid-cols-3 gap-4">
        <TextField label="MQTT Topic" className="col-span-2" value={mqttTopic} onChange={(e) => setMqttTopic(e.target.value)} />
        <NumberField label="Port" value={mqttPort} onChange={(e) => setMqttPort(Number(e.target.value))} min={1} max={65535} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Password</span>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-xl bg-black/30 border border-white/10 px-3 pr-9 text-sm text-paper placeholder:text-paper-dim/50 focus:outline-none focus:border-[#4a63ff] focus:ring-2 focus:ring-[#4a63ff]/25 transition"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-paper-dim hover:text-paper"
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </label>
      </div>
      <div className="h-px bg-white/10" />
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Firmware version" value={firmwareVersion} onChange={(e) => setFirmwareVersion(e.target.value)} />
        <NumberField label="Heartbeat (ms)" value={heartbeatIntervalMs} onChange={(e) => setHeartbeatIntervalMs(Number(e.target.value))} min={1000} step={1000} />
      </div>
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={telemetryEnabled}
          onChange={(e) => setTelemetryEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-black/30 text-[#4a63ff] focus:ring-[#4a63ff]"
        />
        <span className="text-sm text-paper">Telemetry enabled</span>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit">Save configuration</Button>
      </div>
    </form>
  );
}
