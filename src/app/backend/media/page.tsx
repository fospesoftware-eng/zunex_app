"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MonitorPlay,
  Plus,
  Trash2,
  RefreshCw,
  Film,
  ListVideo,
  Server,
  Activity,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Pencil,
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

/* ── Types ─────────────────────────────────────────────────────────────── */

interface MediaAsset {
  id: string;
  name: string;
  description: string;
  videoUrl: string;
  posterUrl: string;
  durationSec: number;
  sizeBytes: number | null;
  mime: string;
  active: boolean;
}

interface Playlist {
  id: string;
  name: string;
  description: string;
  active: boolean;
  itemCount: number;
  assignedDevices: number;
}

interface PlaylistItem {
  mediaId: string;
  position: number;
  asset?: MediaAsset;
}

interface PlusDevice {
  id: string;
  deviceId: string;
  stationId: string;
  deviceType: string;
  connectionStatus: string;
}

interface PlaybackLog {
  id: number;
  deviceId: string;
  playlistId: string | null;
  mediaId: string | null;
  event: string;
  playedAt: string | null;
}

type Tab = "library" | "playlists" | "assignments" | "logs";

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

function fmtSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleString();
}

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function MediaAdsPage() {
  const [tab, setTab] = useState<Tab>("library");
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [devices, setDevices] = useState<PlusDevice[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<PlaybackLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverCfg, setServerCfg] = useState({ baseUrl: "", apiKey: "" });
  const [serverOpen, setServerOpen] = useState(false);
  const [assetModal, setAssetModal] = useState<{ open: boolean; edit: MediaAsset | null }>({ open: false, edit: null });
  const [playlistModal, setPlaylistModal] = useState(false);
  const [itemsPlaylist, setItemsPlaylist] = useState<Playlist | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const headers = await getHeaders();
      const [aRes, pRes, hRes, sRes, lRes] = await Promise.all([
        fetch("/api/backend/media", { headers }),
        fetch("/api/backend/playlists", { headers }),
        fetch("/api/backend/hardware", { headers }),
        fetch("/api/backend/media/settings", { headers }),
        fetch("/api/backend/media/logs?limit=50", { headers }),
      ]);
      const [a, p, h, s, l] = await Promise.all([aRes.json(), pRes.json(), hRes.json(), sRes.json(), lRes.json()]);
      if (a.ok) setAssets(a.data ?? []);
      if (p.ok) setPlaylists(p.data ?? []);
      if (h.ok) setDevices((h.data ?? []).filter((d: PlusDevice) => d.deviceType === "zunex_plus"));
      if (s.ok) setServerCfg(s.data);
      if (l.ok) setLogs(l.data ?? []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  // Load per-device assignments (resolved playback) for plus devices
  const loadAssignments = useCallback(async (devs: PlusDevice[]) => {
    const headers = await getHeaders();
    const map: Record<string, string> = {};
    await Promise.all(
      devs.map(async (d) => {
        try {
          const res = await fetch(`/api/backend/devices/${d.id}/playlist`, { headers });
          const j = await res.json();
          if (j.ok && j.data?.playlistId) map[d.id] = j.data.playlistId;
        } catch { /* ignore */ }
      }),
    );
    setAssignments(map);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (devices.length > 0) loadAssignments(devices); }, [devices, loadAssignments]);

  // Deep link from Hardware page: /backend/media?device=hw_...
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("device")) {
      setTab("assignments");
    }
  }, []);

  const tabs: { key: Tab; label: string; icon: typeof Film; count?: number }[] = [
    { key: "library", label: "Media Library", icon: Film, count: assets.length },
    { key: "playlists", label: "Playlists", icon: ListVideo, count: playlists.length },
    { key: "assignments", label: "Device Assignments", icon: MonitorPlay, count: devices.length },
    { key: "logs", label: "Playback Logs", icon: Activity, count: logs.length },
  ];

  return (
    <motion.div initial={{ opacity: 1 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <PageHeader
        title="Media Ads"
        subtitle="Video ads for Zunex Plus inbuilt players — served from the media server"
        actions={
          <>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#a855f7]/15 border border-[#a855f7]/30 text-[11px] text-[#d8b4fe] font-medium uppercase tracking-wider">
              <MonitorPlay size={11} /> Zunex Plus
            </span>
            <Button variant="ghost" size="md" onClick={load}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button variant="ghost" size="md" onClick={() => setServerOpen(true)}>
              <Server size={14} /> Media server
            </Button>
            <Button size="md" onClick={() => setAssetModal({ open: true, edit: null })}>
              <Plus size={14} /> Add video ad
            </Button>
          </>
        }
      />

      {/* Media server bar */}
      <GlassCard className="mb-6 flex flex-wrap items-center gap-3 py-3">
        <Server size={15} className="text-[#d8b4fe]" />
        <div className="text-xs text-paper-dim">
          Media server: <span className="font-mono text-paper">{serverCfg.baseUrl || "not configured"}</span>
        </div>
        {serverCfg.apiKey ? (
          <Pill variant="success">Device key set</Pill>
        ) : (
          <Pill variant="warn">No device key — device endpoints open</Pill>
        )}
        <span className="text-[11px] text-paper-dim/60 ml-auto">
          Devices poll <code className="font-mono text-[#a9bcff]">/api/device/&lt;deviceId&gt;/playlist</code>
        </span>
      </GlassCard>

      {/* Tabs */}
      <div className="inline-flex rounded-xl border border-white/10 bg-black/20 p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition ${
              tab === t.key
                ? "bg-[#a855f7]/15 text-[#d8b4fe] border border-[#a855f7]/30"
                : "text-paper-dim hover:text-paper border border-transparent"
            }`}
          >
            <t.icon size={13} />
            {t.label}
            {t.count !== undefined && <span className="text-[10px] opacity-70">({t.count})</span>}
          </button>
        ))}
      </div>

      {loading && <div className="text-center text-paper-dim text-sm py-12">Loading media…</div>}

      {!loading && tab === "library" && (
        <LibraryTab
          assets={assets}
          onAdd={() => setAssetModal({ open: true, edit: null })}
          onEdit={(a) => setAssetModal({ open: true, edit: a })}
          onChanged={load}
        />
      )}

      {!loading && tab === "playlists" && (
        <PlaylistsTab
          playlists={playlists}
          onCreate={() => setPlaylistModal(true)}
          onEditItems={(p) => setItemsPlaylist(p)}
          onChanged={load}
        />
      )}

      {!loading && tab === "assignments" && (
        <AssignmentsTab
          devices={devices}
          playlists={playlists}
          assignments={assignments}
          onChanged={() => { load(); }}
        />
      )}

      {!loading && tab === "logs" && <LogsTab logs={logs} />}

      {/* Modals */}
      <Modal
        open={assetModal.open}
        onClose={() => setAssetModal({ open: false, edit: null })}
        title={assetModal.edit ? "Edit video ad" : "Add video ad"}
      >
        <AssetForm
          initial={assetModal.edit}
          onSaved={() => { setAssetModal({ open: false, edit: null }); load(); }}
          onClose={() => setAssetModal({ open: false, edit: null })}
        />
      </Modal>

      <Modal open={playlistModal} onClose={() => setPlaylistModal(false)} title="Create playlist">
        <PlaylistForm onSaved={() => { setPlaylistModal(false); load(); }} onClose={() => setPlaylistModal(false)} />
      </Modal>

      <Modal open={!!itemsPlaylist} onClose={() => setItemsPlaylist(null)} title={`Playlist items — ${itemsPlaylist?.name ?? ""}`}>
        {itemsPlaylist && (
          <PlaylistItemsEditor
            playlist={itemsPlaylist}
            assets={assets}
            onClose={() => { setItemsPlaylist(null); load(); }}
          />
        )}
      </Modal>

      <Modal open={serverOpen} onClose={() => setServerOpen(false)} title="Media server settings">
        <MediaServerForm
          initial={serverCfg}
          onSaved={() => { setServerOpen(false); load(); }}
          onClose={() => setServerOpen(false)}
        />
      </Modal>
    </motion.div>
  );
}

/* ── Library tab ───────────────────────────────────────────────────────── */

function LibraryTab({
  assets, onAdd, onEdit, onChanged,
}: {
  assets: MediaAsset[];
  onAdd: () => void;
  onEdit: (a: MediaAsset) => void;
  onChanged: () => void;
}) {
  const toast = useToast();

  const toggleActive = async (a: MediaAsset) => {
    const res = await fetch(`/api/backend/media/${a.id}`, {
      method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ active: !a.active }),
    });
    const j = await res.json();
    if (j.ok) { toast.show("success", a.active ? "Ad deactivated" : "Ad activated"); onChanged(); }
    else toast.show("error", j.message ?? "Update failed");
  };

  const remove = async (a: MediaAsset) => {
    if (!confirm(`Delete "${a.name}"? It will be removed from all playlists.`)) return;
    const res = await fetch(`/api/backend/media/${a.id}`, { method: "DELETE", headers: await getHeaders() });
    const j = await res.json();
    if (j.ok) { toast.show("success", "Ad deleted"); onChanged(); }
    else toast.show("error", j.message ?? "Delete failed");
  };

  if (assets.length === 0) {
    return (
      <GlassCard className="text-center py-16">
        <Film size={32} className="mx-auto text-paper-dim/40 mb-3" />
        <div className="text-sm text-paper-dim mb-4">No video ads yet. Add your first ad to start building playlists.</div>
        <Button size="md" onClick={onAdd}><Plus size={14} /> Add video ad</Button>
      </GlassCard>
    );
  }

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
      {assets.map((a) => (
        <GlassCard key={a.id} className="hover:border-[#a855f7]/30 transition-all duration-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3b1470] to-[#150a30] border border-[#a855f7]/25 flex items-center justify-center overflow-hidden">
                {a.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.posterUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Film size={16} className="text-[#d8b4fe]" />
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-paper leading-tight">{a.name}</div>
                <div className="text-[10px] text-paper-dim font-mono">{a.id}</div>
              </div>
            </div>
            {a.active ? <Pill variant="success">Active</Pill> : <Pill variant="default">Inactive</Pill>}
          </div>
          <div className="text-[11px] font-mono text-paper-dim/80 break-all mb-3 rounded-lg bg-white/[0.03] border border-white/5 px-2.5 py-1.5">
            {a.videoUrl}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-paper-dim mb-4">
            <span>{a.durationSec}s</span>
            <span>{fmtSize(a.sizeBytes)}</span>
            <span className="font-mono">{a.mime}</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-white/5">
            <button
              onClick={() => toggleActive(a)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-paper-dim hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition"
            >
              {a.active ? "Deactivate" : "Activate"}
            </button>
            <button
              onClick={() => onEdit(a)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-paper-dim hover:text-[#d8b4fe] hover:bg-[#a855f7]/10 border border-transparent hover:border-[#a855f7]/25 transition"
              title="Edit"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => remove(a)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-paper-dim hover:text-ember-400 hover:bg-ember-500/10 border border-transparent hover:border-ember-500/20 transition"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

/* ── Playlists tab ─────────────────────────────────────────────────────── */

function PlaylistsTab({
  playlists, onCreate, onEditItems, onChanged,
}: {
  playlists: Playlist[];
  onCreate: () => void;
  onEditItems: (p: Playlist) => void;
  onChanged: () => void;
}) {
  const toast = useToast();

  const toggleActive = async (p: Playlist) => {
    const res = await fetch(`/api/backend/playlists/${p.id}`, {
      method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ active: !p.active }),
    });
    const j = await res.json();
    if (j.ok) { onChanged(); } else toast.show("error", j.message ?? "Update failed");
  };

  const remove = async (p: Playlist) => {
    if (!confirm(`Delete playlist "${p.name}"? Device assignments will be cleared.`)) return;
    const res = await fetch(`/api/backend/playlists/${p.id}`, { method: "DELETE", headers: await getHeaders() });
    const j = await res.json();
    if (j.ok) { toast.show("success", "Playlist deleted"); onChanged(); }
    else toast.show("error", j.message ?? "Delete failed");
  };

  if (playlists.length === 0) {
    return (
      <GlassCard className="text-center py-16">
        <ListVideo size={32} className="mx-auto text-paper-dim/40 mb-3" />
        <div className="text-sm text-paper-dim mb-4">No playlists yet. Create a playlist, add ads, then assign it to Zunex Plus devices.</div>
        <Button size="md" onClick={onCreate}><Plus size={14} /> Create playlist</Button>
      </GlassCard>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {playlists.map((p) => (
        <GlassCard key={p.id} className="hover:border-[#a855f7]/30 transition-all duration-200">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-sm font-semibold text-paper">{p.name}</div>
              {p.description && <div className="text-[11px] text-paper-dim mt-0.5">{p.description}</div>}
            </div>
            {p.active ? <Pill variant="success">Active</Pill> : <Pill variant="default">Inactive</Pill>}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-paper-dim mb-4">
            <span>{p.itemCount} ad{p.itemCount !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{p.assignedDevices} device{p.assignedDevices !== 1 ? "s" : ""} assigned</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-white/5">
            <button
              onClick={() => onEditItems(p)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-[#d8b4fe] hover:bg-[#a855f7]/10 border border-[#a855f7]/25 hover:border-[#a855f7]/40 transition"
            >
              <ListVideo size={11} /> Edit items
            </button>
            <button
              onClick={() => toggleActive(p)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] text-paper-dim hover:text-white hover:bg-white/5 border border-white/10 hover:border-white/20 transition"
            >
              {p.active ? "Deactivate" : "Activate"}
            </button>
            <button
              onClick={() => remove(p)}
              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-paper-dim hover:text-ember-400 hover:bg-ember-500/10 border border-transparent hover:border-ember-500/20 transition"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

/* ── Assignments tab ───────────────────────────────────────────────────── */

function AssignmentsTab({
  devices, playlists, assignments, onChanged,
}: {
  devices: PlusDevice[];
  playlists: Playlist[];
  assignments: Record<string, string>;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const assign = async (deviceId: string, playlistId: string) => {
    setSaving(deviceId);
    const res = await fetch(`/api/backend/devices/${deviceId}/playlist`, {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ playlistId: playlistId || null }),
    });
    const j = await res.json();
    setSaving("");
    if (j.ok) {
      toast.show("success", playlistId ? "Playlist assigned" : "Assignment cleared");
      onChanged();
    } else {
      toast.show("error", j.message ?? "Assignment failed");
    }
  };

  if (devices.length === 0) {
    return (
      <GlassCard className="text-center py-16">
        <MonitorPlay size={32} className="mx-auto text-paper-dim/40 mb-3" />
        <div className="text-sm text-paper-dim">No Zunex Plus devices yet. Add hardware with device type &quot;Zunex Plus&quot; first.</div>
      </GlassCard>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/[0.04] text-paper-dim/70 uppercase tracking-wider text-[11px]">
            <th className="text-left px-4 py-3 font-medium">Device</th>
            <th className="text-left px-4 py-3 font-medium">Station</th>
            <th className="text-left px-4 py-3 font-medium">Status</th>
            <th className="text-left px-4 py-3 font-medium">Assigned playlist</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.id} className="border-t border-white/5">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <MonitorPlay size={14} className="text-[#d8b4fe]" />
                  <span className="font-mono text-xs text-paper">{d.deviceId}</span>
                </div>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-paper-dim">{d.stationId}</td>
              <td className="px-4 py-3">
                {d.connectionStatus === "online" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#7dedc4]"><CheckCircle2 size={11} /> Online</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#f87171]"><AlertCircle size={11} /> {d.connectionStatus}</span>
                )}
              </td>
              <td className="px-4 py-3">
                <select
                  value={assignments[d.id] ?? ""}
                  disabled={saving === d.id}
                  onChange={(e) => assign(d.id, e.target.value)}
                  className="h-9 min-w-[200px] rounded-xl bg-black/30 border border-white/10 px-3 text-xs text-paper focus:outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/25 transition disabled:opacity-50"
                >
                  <option value="">— No playlist —</option>
                  {playlists.filter((p) => p.active).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.itemCount} ads)</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Logs tab ──────────────────────────────────────────────────────────── */

function LogsTab({ logs }: { logs: PlaybackLog[] }) {
  if (logs.length === 0) {
    return (
      <GlassCard className="text-center py-16">
        <Activity size={32} className="mx-auto text-paper-dim/40 mb-3" />
        <div className="text-sm text-paper-dim">No playback events yet. Devices report proof-of-play here.</div>
      </GlassCard>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white/[0.04] text-paper-dim/70 uppercase tracking-wider text-[11px]">
            <th className="text-left px-4 py-3 font-medium">When</th>
            <th className="text-left px-4 py-3 font-medium">Device</th>
            <th className="text-left px-4 py-3 font-medium">Media</th>
            <th className="text-left px-4 py-3 font-medium">Playlist</th>
            <th className="text-left px-4 py-3 font-medium">Event</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-t border-white/5 text-xs">
              <td className="px-4 py-2.5 text-paper-dim">{fmtTime(l.playedAt)}</td>
              <td className="px-4 py-2.5 font-mono text-paper">{l.deviceId}</td>
              <td className="px-4 py-2.5 font-mono text-paper-dim">{l.mediaId ?? "—"}</td>
              <td className="px-4 py-2.5 font-mono text-paper-dim">{l.playlistId ?? "—"}</td>
              <td className="px-4 py-2.5">
                <Pill variant={l.event === "complete" ? "success" : l.event === "error" ? "error" : "info"}>{l.event}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Forms ─────────────────────────────────────────────────────────────── */

function AssetForm({ initial, onSaved, onClose }: { initial: MediaAsset | null; onSaved: () => void; onClose: () => void }) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [posterUrl, setPosterUrl] = useState(initial?.posterUrl ?? "");
  const [durationSec, setDurationSec] = useState<number>(initial?.durationSec ?? 15);
  const [sizeMb, setSizeMb] = useState<string>(initial?.sizeBytes ? (initial.sizeBytes / (1024 * 1024)).toFixed(1) : "");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !videoUrl.trim()) { toast.show("error", "Name and video URL are required"); return; }
    setSaving(true);
    const body = {
      name: name.trim(),
      description: description.trim(),
      videoUrl: videoUrl.trim(),
      posterUrl: posterUrl.trim(),
      durationSec,
      sizeBytes: sizeMb ? Math.round(Number(sizeMb) * 1024 * 1024) : null,
    };
    const url = isEdit ? `/api/backend/media/${initial!.id}` : "/api/backend/media";
    const res = await fetch(url, { method: isEdit ? "PATCH" : "POST", headers: await authHeaders(), body: JSON.stringify(body) });
    const j = await res.json();
    setSaving(false);
    if (j.ok) { toast.show("success", isEdit ? "Ad updated" : "Video ad added"); onSaved(); }
    else toast.show("error", j.message ?? "Save failed");
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <TextField label="Ad name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Summer Promo 15s" />
      <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
      <TextField
        label="Video URL"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        required
        placeholder="promo/summer-15s.mp4 or https://cdn.example.com/ad.mp4"
      />
      <div className="text-[11px] text-paper-dim/70 -mt-2">
        Relative paths are resolved against the media server base URL.
      </div>
      <TextField label="Poster image URL" value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} placeholder="Optional thumbnail" />
      <div className="grid grid-cols-2 gap-4">
        <NumberField label="Duration (sec)" value={durationSec} onChange={(e) => setDurationSec(Number(e.target.value))} min={1} />
        <TextField label="Size (MB)" value={sizeMb} onChange={(e) => setSizeMb(e.target.value)} placeholder="Optional" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : isEdit ? "Save changes" : "Add video ad"}</Button>
      </div>
    </form>
  );
}

function PlaylistForm({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.show("error", "Name is required"); return; }
    setSaving(true);
    const res = await fetch("/api/backend/playlists", {
      method: "POST", headers: await authHeaders(), body: JSON.stringify({ name: name.trim(), description: description.trim() }),
    });
    const j = await res.json();
    setSaving(false);
    if (j.ok) { toast.show("success", "Playlist created"); onSaved(); }
    else toast.show("error", j.message ?? "Save failed");
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <TextField label="Playlist name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Festive rotation" />
      <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create playlist"}</Button>
      </div>
    </form>
  );
}

function PlaylistItemsEditor({
  playlist, assets, onClose,
}: {
  playlist: Playlist;
  assets: MediaAsset[];
  onClose: () => void;
}) {
  const [items, setItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pick, setPick] = useState("");
  const toast = useToast();

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/backend/playlists/${playlist.id}`, { headers: await getHeaders() });
      const j = await res.json();
      if (j.ok) setItems(j.data.items ?? []);
      setLoading(false);
    })();
  }, [playlist.id]);

  const addItem = () => {
    if (!pick || items.some((i) => i.mediaId === pick)) return;
    const asset = assets.find((a) => a.id === pick);
    setItems((prev) => [...prev, { mediaId: pick, position: prev.length, asset }]);
    setPick("");
  };

  const move = (idx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next.map((it, i) => ({ ...it, position: i }));
    });
  };

  const removeAt = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx).map((it, i) => ({ ...it, position: i })));
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/backend/playlists/${playlist.id}/items`, {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ mediaIds: items.map((i) => i.mediaId) }),
    });
    const j = await res.json();
    setSaving(false);
    if (j.ok) { toast.show("success", "Playlist items saved"); onClose(); }
    else toast.show("error", j.message ?? "Save failed");
  };

  const available = assets.filter((a) => a.active && !items.some((i) => i.mediaId === a.id));

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      {loading ? (
        <div className="text-center text-paper-dim text-sm py-8">Loading items…</div>
      ) : (
        <>
          {items.length === 0 && (
            <div className="text-center text-paper-dim text-xs py-6 rounded-xl border border-dashed border-white/10">
              No ads in this playlist yet — add from the library below.
            </div>
          )}
          <div className="space-y-1.5">
            {items.map((it, idx) => (
              <div key={it.mediaId} className="flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2">
                <span className="text-[10px] font-mono text-paper-dim/60 w-5">{idx + 1}.</span>
                <Film size={12} className="text-[#d8b4fe] shrink-0" />
                <span className="text-xs text-paper truncate flex-1">{it.asset?.name ?? it.mediaId}</span>
                <span className="text-[10px] text-paper-dim">{it.asset?.durationSec ?? "?"}s</span>
                <button type="button" onClick={() => move(idx, -1)} className="p-1 text-paper-dim hover:text-paper" title="Move up"><ArrowUp size={12} /></button>
                <button type="button" onClick={() => move(idx, 1)} className="p-1 text-paper-dim hover:text-paper" title="Move down"><ArrowDown size={12} /></button>
                <button type="button" onClick={() => removeAt(idx)} className="p-1 text-paper-dim hover:text-ember-400" title="Remove"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="h-10 flex-1 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper focus:outline-none focus:border-[#a855f7] focus:ring-2 focus:ring-[#a855f7]/25 transition"
            >
              <option value="">Select ad to add…</option>
              {available.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.durationSec}s)</option>
              ))}
            </select>
            <Button type="button" variant="ghost" onClick={addItem} disabled={!pick}>
              <Plus size={14} /> Add
            </Button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={save} disabled={saving}>{saving ? "Saving…" : `Save ${items.length} item${items.length !== 1 ? "s" : ""}`}</Button>
          </div>
        </>
      )}
    </div>
  );
}

function MediaServerForm({
  initial, onSaved, onClose,
}: {
  initial: { baseUrl: string; apiKey: string };
  onSaved: () => void;
  onClose: () => void;
}) {
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUrl.trim()) { toast.show("error", "Base URL is required"); return; }
    setSaving(true);
    const res = await fetch("/api/backend/media/settings", {
      method: "PUT", headers: await authHeaders(), body: JSON.stringify({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() }),
    });
    const j = await res.json();
    setSaving(false);
    if (j.ok) { toast.show("success", "Media server saved"); onSaved(); }
    else toast.show("error", j.message ?? "Save failed");
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <TextField
        label="Media server base URL"
        value={baseUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        required
        placeholder="https://media.zunexglobal.com/ads"
      />
      <TextField
        label="Device API key (optional)"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Devices must send this as x-device-key"
      />
      <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-paper-dim/80 leading-relaxed">
        Zunex Plus players poll <code className="font-mono text-[#a9bcff]">GET /api/device/&lt;deviceId&gt;/playlist</code> and
        report playback to <code className="font-mono text-[#a9bcff]">POST /api/device/&lt;deviceId&gt;/playback</code>.
        Relative ad URLs are resolved against this base URL.
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save settings"}</Button>
      </div>
    </form>
  );
}
