"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import QRCode from "qrcode";
import {
  RefreshCw,
  Zap,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Wifi as WifiIcon,
  WifiOff,
  Server,
  Cpu,
  Activity,
  Settings2,
  Plus,
  Trash2,
  QrCode,
  Download,
  Upload,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/backend/PageHeader";
import { GlassCard } from "@/components/backend/GlassCard";
import { Button } from "@/components/backend/Button";
import { Pill } from "@/components/backend/Pill";
import { Modal } from "@/components/backend/Modal";
import { TextField } from "@/components/backend/TextField";
import { NumberField } from "@/components/backend/NumberField";
import { useToast } from "@/components/backend/Toast";
import { getAccessToken } from "@/lib/client/backendAuth";

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
  clientId?: string;
  useTls?: boolean;
  username: string;
  password: string;
  firmwareVersion: string;
  heartbeatIntervalMs: number;
  lastSeenAt: number | null;
  connectionStatus: ConnectionStatus;
  telemetryEnabled: boolean;
  updatedAt: number;
  deviceModel?: DeviceModel;
  installType?: InstallType;
}

async function getHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = await getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
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
  const [newOpen, setNewOpen] = useState(false);
  const [qrDevice, setQrDevice] = useState<HardwareRow | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const toast = useToast();

  const load = async () => {
    try {
      const res = await fetch("/api/backend/hardware", { headers: await getHeaders() });
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
    const res = await fetch("/api/backend/hardware/heartbeat", { method: "POST", headers: await getHeaders() });
    const j = await res.json();
    if (j.ok) {
      setDevices(j.data ?? []);
      toast.show("success", "Heartbeat simulated");
    } else toast.show("error", j.message ?? "Heartbeat failed");
  };

  const handleDelete = async (d: HardwareRow) => {
    if (!confirm(`Delete hardware for ${d.stationId}? This removes device config from DB.`)) return;
    const res = await fetch(`/api/backend/hardware/${d.id}`, {
      method: "DELETE", headers: await getHeaders(),
    });
    const j = await res.json();
    if (j.ok) { toast.show("success", "Hardware removed"); load(); }
    else toast.show("error", j.message ?? "Delete failed");
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
            <Button variant="ghost" size="md" onClick={() => setBulkOpen(true)}>
              <Upload size={14} /> Bulk import
            </Button>
            <Button size="md" onClick={() => setNewOpen(true)}>
              <Plus size={14} /> Add hardware
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
                  {d.deviceModel && modelBg[d.deviceModel] && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${modelBg[d.deviceModel]}`}>
                      {d.deviceModel}
                    </span>
                  )}
                  {d.installType && installLabel[d.installType] && (
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
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setQrDevice(d)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-paper-dim hover:text-[#4a63ff] hover:bg-[#4a63ff]/10 border border-transparent hover:border-[#4a63ff]/20 transition"
                    title="Show QR code"
                  >
                    <QrCode size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(d)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-paper-dim hover:text-ember-400 hover:bg-ember-500/10 border border-transparent hover:border-ember-500/20 transition"
                    title="Delete hardware"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button
                    onClick={() => setEditDevice(d)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-paper-dim hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition"
                  >
                    <Settings2 size={11} /> Configure
                  </button>
                </div>
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

      {/* Add Modal */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Add hardware device">
        <HardwareForm
          onSaved={() => { setNewOpen(false); load(); }}
          onClose={() => setNewOpen(false)}
        />
      </Modal>

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

      {/* QR Modal */}
      <Modal open={!!qrDevice} onClose={() => setQrDevice(null)} title="Device QR Code">
        {qrDevice && <QrPanel device={qrDevice} />}
      </Modal>

      {/* Bulk Import Modal */}
      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk import hardware (CSV)">
        <BulkImportForm
          onDone={() => { setBulkOpen(false); load(); }}
          onClose={() => setBulkOpen(false)}
        />
      </Modal>
    </motion.div>
  );
}

/* ── Bulk CSV Import ──────────────────────────────────────────────────── */

interface CsvRow {
  deviceId: string;
  stationId: string;
  brokerUrl: string;
  mqttPort: string;
  mqttTopic: string;
  clientId: string;
  useTls: string;
  username: string;
  password: string;
  firmwareVersion: string;
  heartbeatIntervalMs: string;
  telemetryEnabled: string;
}

interface ImportResult {
  row: number;
  deviceId: string;
  ok: boolean;
  error?: string;
}

const CSV_HEADERS = [
  "device_id", "station_id", "broker_url", "mqtt_port", "mqtt_topic",
  "client_id", "use_tls", "username", "password", "firmware_version",
  "heartbeat_ms", "telemetry_enabled",
];

const CSV_TEMPLATE = `${CSV_HEADERS.join(",")}
ZXN-DVC-ZNX-A1-001,ZNX-A1,mqtt://broker.zunexglobal.com,1883,,,false,,,v1.0.0,30000,true
ZXN-DVC-ZNX-A1-002,ZNX-A1,mqtts://broker.zunexglobal.com,8883,,,true,,,v1.0.0,30000,true`;

function parseCsv(text: string): { rows: CsvRow[]; error?: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], error: "CSV must have a header row + at least 1 data row" };
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^\uFEFF/, ""));
  const di = headers.indexOf("device_id");
  const si = headers.indexOf("station_id");
  if (di === -1 || si === -1) return { rows: [], error: "CSV must contain device_id and station_id columns" };

  const idx = (name: string) => headers.indexOf(name);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.every((c) => !c)) continue;
    const get = (name: string) => (idx(name) >= 0 ? cols[idx(name)] ?? "" : "");
    rows.push({
      deviceId: get("device_id"),
      stationId: get("station_id"),
      brokerUrl: get("broker_url"),
      mqttPort: get("mqtt_port"),
      mqttTopic: get("mqtt_topic"),
      clientId: get("client_id"),
      useTls: get("use_tls"),
      username: get("username"),
      password: get("password"),
      firmwareVersion: get("firmware_version"),
      heartbeatIntervalMs: get("heartbeat_ms"),
      telemetryEnabled: get("telemetry_enabled"),
    });
  }
  if (rows.length === 0) return { rows: [], error: "No data rows found" };
  return { rows };
}

function BulkImportForm({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [summary, setResultsMeta] = useState<{ created: number; failed: number } | null>(null);
  const toast = useToast();

  const handleFile = (file: File) => {
    setFileName(file.name);
    setResults(null);
    setResultsMeta(null);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ""));
      if (parsed.error) {
        setRows([]);
        setParseError(parsed.error);
      } else {
        setRows(parsed.rows);
        setParseError("");
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zunex-hardware-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/backend/hardware/bulk", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ rows }),
      });
      const j = await res.json();
      if (j.ok) {
        setResults(j.data.results);
        setResultsMeta({ created: j.data.created, failed: j.data.failed });
        if (j.data.created > 0) {
          toast.show("success", `Imported ${j.data.created} device${j.data.created !== 1 ? "s" : ""}`);
        }
        if (j.data.failed > 0) {
          toast.show("error", `${j.data.failed} row${j.data.failed !== 1 ? "s" : ""} failed`);
        }
      } else {
        toast.show("error", j.message ?? "Import failed");
      }
    } catch {
      toast.show("error", "Import failed — network error");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      {/* Template + upload */}
      <div className="flex items-center gap-2">
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-paper-dim hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition"
        >
          <Download size={12} /> Download CSV template
        </button>
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer bg-[#4a63ff]/15 border border-[#4a63ff]/30 text-[#a9bcff] hover:bg-[#4a63ff]/25 hover:border-[#4a63ff]/50 transition">
          <Upload size={12} /> {fileName || "Choose CSV file"}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {parseError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-ember-500/10 border border-ember-500/25 text-ember-400 text-xs">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Column reference */}
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-paper-dim/80 leading-relaxed">
        <span className="text-paper-dim font-medium">Columns:</span>{" "}
        <code className="font-mono text-[#a9bcff]">{CSV_HEADERS.join(", ")}</code>
        <br />
        Only <code className="font-mono text-[#a9bcff]">device_id</code> and{" "}
        <code className="font-mono text-[#a9bcff]">station_id</code> are required. Empty cells use defaults
        (broker mqtt://broker.zunexglobal.com, port 1883, topic auto, firmware v1.0.0, heartbeat 30000, telemetry on).
      </div>

      {/* Preview */}
      {rows.length > 0 && !results && (
        <>
          <div className="text-xs text-paper-dim font-medium">
            Preview — {rows.length} row{rows.length !== 1 ? "s" : ""} ready
          </div>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-white/[0.04] text-paper-dim/70 uppercase tracking-wider">
                  <th className="text-left px-3 py-2 font-medium">#</th>
                  <th className="text-left px-3 py-2 font-medium">Device ID</th>
                  <th className="text-left px-3 py-2 font-medium">Station</th>
                  <th className="text-left px-3 py-2 font-medium">Broker</th>
                  <th className="text-left px-3 py-2 font-medium">Port</th>
                  <th className="text-left px-3 py-2 font-medium">TLS</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 12).map((r, i) => (
                  <tr key={i} className="border-t border-white/5 text-paper-dim">
                    <td className="px-3 py-1.5 text-paper-dim/50">{i + 1}</td>
                    <td className="px-3 py-1.5 font-mono text-paper">{r.deviceId || <span className="text-ember-400">missing</span>}</td>
                    <td className="px-3 py-1.5 font-mono">{r.stationId || <span className="text-ember-400">missing</span>}</td>
                    <td className="px-3 py-1.5 font-mono truncate max-w-[160px]">{r.brokerUrl || <span className="text-paper-dim/40">default</span>}</td>
                    <td className="px-3 py-1.5 font-mono">{r.mqttPort || "1883"}</td>
                    <td className="px-3 py-1.5 font-mono">{r.useTls || "false"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 12 && (
              <div className="px-3 py-2 text-[11px] text-paper-dim/50 bg-white/[0.02] border-t border-white/5">
                … and {rows.length - 12} more
              </div>
            )}
          </div>
        </>
      )}

      {/* Results */}
      {results && summary && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Pill variant="success">{summary.created} imported</Pill>
            {summary.failed > 0 && <Pill variant="error">{summary.failed} failed</Pill>}
          </div>
          {summary.failed > 0 && (
            <div className="rounded-xl border border-ember-500/20 bg-ember-500/5 divide-y divide-ember-500/10 max-h-40 overflow-y-auto">
              {results.filter((r) => !r.ok).map((r) => (
                <div key={r.row} className="px-3 py-2 text-[11px] flex items-center gap-2">
                  <AlertCircle size={12} className="text-ember-400 shrink-0" />
                  <span className="font-mono text-paper-dim/60">row {r.row}</span>
                  <span className="font-mono text-paper truncate">{r.deviceId}</span>
                  <span className="text-ember-400 ml-auto">{r.error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={results ? onDone : onClose}>
          {results ? "Done" : "Cancel"}
        </Button>
        {!results && (
          <Button type="button" onClick={submit} disabled={rows.length === 0 || submitting}>
            {submitting ? "Importing…" : `Import ${rows.length} device${rows.length !== 1 ? "s" : ""}`}
          </Button>
        )}
      </div>
    </div>
  );
}

function QrPanel({ device }: { device: HardwareRow }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    const payload = JSON.stringify({
      d: device.deviceId,
      s: device.stationId,
      b: device.brokerUrl,
      t: device.mqttTopic,
      p: device.mqttPort,
      c: device.clientId ?? device.deviceId,
      l: device.useTls ? "tls" : "tcp",
      f: device.firmwareVersion,
    });

    const draw = async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;
        await QRCode.toCanvas(canvas, payload, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 320,
          color: { dark: "#e8edff", light: "#0b1024" },
        });
        const url = canvas.toDataURL("image/png");
        setDataUrl(url);
      } catch (e) {
        console.error("QR draw error:", e);
      }
    };
    draw();
  }, [device]);

  const onDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `hardware-${device.deviceId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="w-56 h-56 p-4 rounded-2xl bg-gradient-to-br from-[#0f1a4a] to-[#0b1024] border border-[#4a63ff]/30 shadow-[0_0_40px_rgba(74,99,255,0.15)] flex items-center justify-center">
        <canvas ref={canvasRef} className="max-w-full max-h-full" />
      </div>
      <div className="text-center space-y-1">
        <div className="font-mono text-sm text-paper">{device.deviceId}</div>
        <div className="text-[11px] text-paper-dim">Station {device.stationId}</div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-paper-dim w-full">
        <span className="text-right text-paper-dim/70">Broker</span>
        <span className="font-mono text-paper truncate">{device.brokerUrl}:{device.mqttPort}</span>
        <span className="text-right text-paper-dim/70">Topic</span>
        <span className="font-mono text-paper truncate">{device.mqttTopic}</span>
        <span className="text-right text-paper-dim/70">TLS</span>
        <span className="font-mono text-paper">{device.useTls ? "enabled" : "disabled"}</span>
        <span className="text-right text-paper-dim/70">Firmware</span>
        <span className="font-mono text-paper">{device.firmwareVersion}</span>
      </div>
      <div className="flex items-center gap-2 pt-2 w-full">
        <button
          onClick={onDownload}
          disabled={!dataUrl}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#4a63ff]/15 border border-[#4a63ff]/30 text-[#a9bcff] text-sm font-medium hover:bg-[#4a63ff]/25 hover:border-[#4a63ff]/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={14} /> Download PNG
        </button>
      </div>
    </div>
  );
}

interface HardwareFormProps {
  initial?: HardwareRow;
  onSaved: () => void;
  onClose: () => void;
}

function HardwareForm({ initial, onSaved, onClose }: HardwareFormProps) {
  const isEdit = !!initial;
  const [stations, setStations] = useState<{ id: string; name: string }[]>([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationId, setStationId] = useState(initial?.stationId ?? "");
  const [deviceId, setDeviceId] = useState(initial?.deviceId ?? "");
  const [brokerUrl, setBrokerUrl] = useState(initial?.brokerUrl ?? "mqtt://broker.zunexglobal.com");
  const [mqttTopic, setMqttTopic] = useState(initial?.mqttTopic ?? "");
  const [mqttPort, setMqttPort] = useState<number>(initial?.mqttPort ?? 1883);
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [useTls, setUseTls] = useState<boolean>(initial?.useTls ?? false);
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [showPw, setShowPw] = useState(false);
  const [firmwareVersion, setFirmwareVersion] = useState(initial?.firmwareVersion ?? "v1.0.0");
  const [heartbeatIntervalMs, setHeartbeatIntervalMs] = useState<number>(initial?.heartbeatIntervalMs ?? 30000);
  const [telemetryEnabled, setTelemetryEnabled] = useState<boolean>(initial?.telemetryEnabled ?? true);
  const toast = useToast();

  useEffect(() => {
    const loadStations = async () => {
      try {
        const res = await fetch("/api/backend/stations", { headers: await getHeaders() });
        const j = await res.json();
        if (j.ok) setStations((j.data ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      } catch { /* ignore */ }
      setStationsLoading(false);
    };
    loadStations();
  }, []);

  const onStationChange = (val: string) => {
    setStationId(val);
    if (!isEdit && val && !deviceId) {
      setDeviceId(`ZNV-DVC-${val}-001`);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationId || !deviceId) { toast.show("error", "Station and device ID are required"); return; }
    const body = {
      stationId, deviceId, brokerUrl,
      mqttTopic: mqttTopic || `zunex/stations/${stationId}`,
      mqttPort, clientId: clientId || deviceId, useTls,
      username, password,
      firmwareVersion, heartbeatIntervalMs, telemetryEnabled,
    };
    const url = isEdit ? `/api/backend/hardware/${initial!.id}` : "/api/backend/hardware";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: await authHeaders(), body: JSON.stringify(body) });
    const j = await res.json();
    if (j.ok) { toast.show("success", isEdit ? "Device config updated" : "Hardware added"); onSaved(); }
    else toast.show("error", j.message ?? "Failed to save");
  };

  return (
    <form onSubmit={save} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Station</span>
          <select
            value={stationId}
            onChange={(e) => onStationChange(e.target.value)}
            disabled={isEdit}
            className={`h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper focus:outline-none focus:border-[#4a63ff] focus:ring-2 focus:ring-[#4a63ff]/25 transition ${isEdit ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <option value="">{stationsLoading ? "Loading stations…" : "Select a station"}</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.name}
              </option>
            ))}
          </select>
        </label>
        <TextField label="Device ID" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required />
      </div>
      <div className="h-px bg-white/10" />
      <TextField label="Broker URL" value={brokerUrl} onChange={(e) => setBrokerUrl(e.target.value)} />
      <div className="grid grid-cols-3 gap-4">
        <TextField label="MQTT Topic" className="col-span-2" value={mqttTopic} onChange={(e) => setMqttTopic(e.target.value)} />
        <NumberField label="Port" value={mqttPort} onChange={(e) => setMqttPort(Number(e.target.value))} min={1} max={65535} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <TextField label="Client ID" className="col-span-2" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="defaults to Device ID" />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">TLS</span>
          <div className="h-10 flex items-center gap-2 px-3 rounded-xl bg-black/30 border border-white/10">
            <input
              type="checkbox"
              checked={useTls}
              onChange={(e) => setUseTls(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/30 text-[#4a63ff] focus:ring-[#4a63ff]"
            />
            <span className="text-sm text-paper-dim">{useTls ? "mqtts://" : "mqtt://"}</span>
          </div>
        </label>
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
        <Button type="submit">{isEdit ? "Save configuration" : "Add hardware"}</Button>
      </div>
    </form>
  );
}
