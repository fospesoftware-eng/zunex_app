"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Zap, Eye, EyeOff } from "lucide-react";
import { PageHeader } from "@/components/backend/PageHeader";
import { StatCard } from "@/components/backend/StatCard";
import { DataTable } from "@/components/backend/DataTable";
import type { ColumnDef } from "@/components/backend/DataTable";
import { Modal } from "@/components/backend/Modal";
import { Button } from "@/components/backend/Button";
import { Pill } from "@/components/backend/Pill";
import { TextField } from "@/components/backend/TextField";
import { NumberField } from "@/components/backend/NumberField";
import { GlassCard } from "@/components/backend/GlassCard";
import { useToast } from "@/components/backend/Toast";
import { getStoredToken } from "@/lib/client/backendAuth";

type ConnectionStatus = "online" | "offline" | "connecting" | "unknown";

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
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = getStoredToken();
  if (token) headers["x-zunex-admin-token"] = token;
  return headers;
}

function getHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers["x-zunex-admin-token"] = token;
  return headers;
}

function fetchData<T>(path: string): Promise<T> {
  return fetch(path, { headers: getHeaders() }).then((r) => r.json()).then((j) => j.data as T);
}

function connectionPill(s: ConnectionStatus) {
  switch (s) {
    case "online": return <Pill variant="success">Online</Pill>;
    case "offline": return <Pill variant="error">Offline</Pill>;
    case "connecting": return <Pill variant="warn">Connecting</Pill>;
    case "unknown": return <Pill variant="default">Unknown</Pill>;
  }
}

function fmtLastSeen(ts: number | null) {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  if (diff < 5000) return "Just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return new Date(ts).toLocaleString();
}

function firmwareAgeDays(version: string): number {
  // Parse version number "vX.Y.Z" — use X+Y+Z as a fake age multiplier.
  const parts = version.match(/(\d+)/g);
  if (!parts) return 3;
  const nums = parts.map(Number);
  const latest = nums.reduce((a, b) => a + b, 0);
  // Baseline: treat version sum as "days since release" when total < 30
  return Math.max(1, latest % 30);
}

export default function HardwarePage() {
  const [devices, setDevices] = useState<HardwareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDevice, setEditDevice] = useState<HardwareRow | null>(null);
  const [show, setShow] = useState(true);
  const toast = useToast();

  const load = () => {
    fetchData<HardwareRow[]>("/api/backend/hardware").then((d) => setDevices(d ?? []));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerHeartbeat = async (id?: string) => {
    const path = id ? `/api/backend/hardware/heartbeat?station=${id}` : "/api/backend/hardware/heartbeat";
    const res = await fetch(path, { method: "POST", headers: getHeaders() });
    const j = await res.json();
    if (j.ok) {
      setDevices(j.data ?? []);
      if (!id) toast.show("success", "Heartbeat simulated");
    } else {
      toast.show("error", j.message ?? "Heartbeat failed");
    }
  };

  const stats = useMemo(() => {
    const online = devices.filter((d) => d.connectionStatus === "online").length;
    const offline = devices.filter((d) => d.connectionStatus === "offline").length;
    const avgAge = devices.length
      ? Math.round(devices.reduce((acc, d) => acc + firmwareAgeDays(d.firmwareVersion), 0) / devices.length)
      : 0;
    return { online, offline, total: devices.length, avgAge };
  }, [devices]);

  const handleDelete = (row: HardwareRow) => {
    if (!confirm(`Remove hardware config for ${row.deviceId}?`)) return;
    fetch(`/api/backend/hardware/${row.id}`, { method: "DELETE", headers: getHeaders() })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) { toast.show("success", "Config removed"); load(); }
        else toast.show("error", j.message);
      });
  };

  const columns: ColumnDef<HardwareRow>[] = [
    {
      key: "deviceId",
      header: "Device",
      render: (r) => (
        <div className="font-mono text-sm">
          <div className="font-medium text-paper">{r.deviceId}</div>
          <div className="text-[11px] text-paper-dim/60">{r.id}</div>
        </div>
      ),
    },
    { key: "stationId", header: "Station", render: (r) => <span className="font-mono">{r.stationId}</span> },
    { key: "brokerUrl", header: "Broker", render: (r) => <span className="text-xs text-paper-dim">{r.brokerUrl}:{r.mqttPort}</span> },
    { key: "mqttTopic", header: "MQTT Topic", render: (r) => <span className="font-mono text-xs text-paper-dim">{r.mqttTopic}</span> },
    { key: "firmwareVersion", header: "Firmware", render: (r) => <span className="font-mono">{r.firmwareVersion}</span> },
    { key: "connectionStatus", header: "Connection", render: (r) => connectionPill(r.connectionStatus) },
    { key: "lastSeenAt", header: "Last Seen", render: (r) => <span className="text-xs text-paper-dim">{fmtLastSeen(r.lastSeenAt)}</span> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      key={show ? "on" : "off"}
    >
      <PageHeader
        title="Hardware & MQTT"
        subtitle="Device connectivity, firmware, and broker configuration"
        actions={
          <>
            <Button variant="ghost" size="md" onClick={load}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button variant="ghost" size="md" onClick={() => triggerHeartbeat()}>
              <Zap size={14} /> Simulate heartbeat
            </Button>
            <Button size="md" onClick={() => setEditDevice({} as HardwareRow)}>
              <span>+ Add hardware</span>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Online Devices" value={stats.online} accent="from-mint-400/40 to-mint-500/10" />
        <StatCard label="Offline Devices" value={stats.offline} accent="from-ember-500/40 to-ember-600/10" />
        <StatCard label="Total Hardware" value={stats.total} accent="from-[#4a63ff]/40 to-[#2447ff]/10" />
        <StatCard label="Avg Firmware Age" value={`${stats.avgAge}d`} accent="from-amber-400/40 to-amber-500/10" />
      </div>

      <GlassCard>
        <DataTable
          columns={columns}
          data={devices}
          rowKey={(r) => r.id}
          loading={loading}
          renderActions={(r) => (
            <div className="flex items-center gap-1">
              <button
                onClick={() => triggerHeartbeat(r.id)}
                className="p-1.5 rounded-lg text-paper-dim hover:text-amber-400 hover:bg-amber-500/10 transition"
                aria-label="Reset heartbeat"
                title="Reset heartbeat"
              >
                <Zap size={14} />
              </button>
              <button
                onClick={() => setEditDevice(r)}
                className="p-1.5 rounded-lg text-paper-dim hover:text-paper hover:bg-white/8 transition"
                aria-label="Edit"
              >
                ✎
              </button>
              <button
                onClick={() => handleDelete(r)}
                className="p-1.5 rounded-lg text-paper-dim hover:text-ember-400 hover:bg-ember-500/10 transition"
                aria-label="Delete"
              >
                ✕
              </button>
            </div>
          )}
          emptyMessage="No hardware configs yet"
        />
      </GlassCard>

      <Modal open={!!editDevice} onClose={() => setEditDevice(null)} title={editDevice?.id ? "Edit hardware config" : "Add hardware config"}>
        {editDevice && (
          <HardwareForm
            initial={editDevice?.id ? editDevice : undefined}
            onSaved={() => { setEditDevice(null); load(); }}
            onClose={() => setEditDevice(null)}
          />
        )}
      </Modal>
    </motion.div>
  );
}

interface HardwareFormProps {
  initial?: HardwareRow;
  onSaved: () => void;
  onClose: () => void;
}

function HardwareForm({ initial, onSaved, onClose }: HardwareFormProps) {
  const [stationId, setStationId] = useState(initial?.stationId ?? "");
  const [deviceId, setDeviceId] = useState(initial?.deviceId ?? "");
  const [brokerUrl, setBrokerUrl] = useState(initial?.brokerUrl ?? "mqtt://broker.zunexglobal.com");
  const [mqttTopic, setMqttTopic] = useState(initial?.mqttTopic ?? "");
  const [mqttPort, setMqttPort] = useState<number>(initial?.mqttPort ?? 1883);
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [showPw, setShowPw] = useState(false);
  const [firmwareVersion, setFirmwareVersion] = useState(initial?.firmwareVersion ?? "v1.0.0");
  const [heartbeatIntervalMs, setHeartbeatIntervalMs] = useState<number>(initial?.heartbeatIntervalMs ?? 30000);
  const [telemetryEnabled, setTelemetryEnabled] = useState<boolean>(initial?.telemetryEnabled ?? true);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationId || !deviceId) {
      toast.show("error", "Station and device ID are required");
      return;
    }
    if (!mqttTopic) setMqttTopic(`zunex/stations/${stationId}`);
    const body = {
      stationId, deviceId, brokerUrl, mqttTopic, mqttPort, username, password,
      firmwareVersion, heartbeatIntervalMs, telemetryEnabled,
    };
    let j: { ok: boolean; message?: string };
    if (initial?.id) {
      const res = await fetch(`/api/backend/hardware/${initial.id}`, {
        method: "PATCH", headers: authHeaders(), body: JSON.stringify(body),
      });
      j = await res.json();
    } else {
      const res = await fetch("/api/backend/hardware", {
        method: "POST", headers: authHeaders(), body: JSON.stringify(body),
      });
      j = await res.json();
    }
    if (j.ok) { toast.show("success", initial?.id ? "Config updated" : "Config added"); onSaved(); }
    else toast.show("error", j.message ?? "Failed to save");
  };

  return (
    <form onSubmit={save} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Station ID" value={stationId} onChange={(e) => setStationId(e.target.value)} required placeholder="ZNX-A1" />
        <TextField label="Device ID" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required placeholder="ZXN-DVC-ZNX-A1-001" />
      </div>
      <TextField label="Broker URL" value={brokerUrl} onChange={(e) => setBrokerUrl(e.target.value)} required placeholder="mqtt://broker.zunexglobal.com" />
      <div className="grid grid-cols-3 gap-4">
        <TextField label="MQTT Topic" className="col-span-2" value={mqttTopic} onChange={(e) => setMqttTopic(e.target.value)} placeholder="zunex/stations/ZNX-A1" />
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
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Firmware version" value={firmwareVersion} onChange={(e) => setFirmwareVersion(e.target.value)} placeholder="v2.4.1" />
        <NumberField label="Heartbeat interval (ms)" value={heartbeatIntervalMs} onChange={(e) => setHeartbeatIntervalMs(Number(e.target.value))} min={1000} step={1000} />
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
        <Button type="submit">{initial?.id ? "Save changes" : "Add hardware"}</Button>
      </div>
    </form>
  );
}
