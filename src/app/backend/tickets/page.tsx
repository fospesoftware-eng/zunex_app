"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Plus, Ticket as TicketIcon } from "lucide-react";
import { PageHeader } from "@/components/backend/PageHeader";
import { StatCard } from "@/components/backend/StatCard";
import { DataTable } from "@/components/backend/DataTable";
import type { ColumnDef } from "@/components/backend/DataTable";
import { Modal } from "@/components/backend/Modal";
import { Button } from "@/components/backend/Button";
import { Pill } from "@/components/backend/Pill";
import { TextField } from "@/components/backend/TextField";
import { GlassCard } from "@/components/backend/GlassCard";
import { useToast } from "@/components/backend/Toast";
import { getStoredToken } from "@/lib/client/backendAuth";

type Priority = "low" | "medium" | "high" | "critical";
type Status = "open" | "in_progress" | "resolved" | "closed";

interface TicketRow {
  id: string;
  subject: string;
  description: string;
  priority: Priority;
  status: Status;
  requesterName: string;
  requesterEmail: string;
  stationId: string | null;
  assignee: string | null;
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
}

interface StationRef {
  id: string;
  name: string;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = getStoredToken();
  if (token) headers["x-zunex-admin-token"] = token;
  return headers;
}

function fetchData<T>(path: string): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers["x-zunex-admin-token"] = token;
  return fetch(path, { headers }).then((r) => r.json()).then((j) => j.data as T);
}

function priorityPill(p: Priority) {
  switch (p) {
    case "critical": return <Pill variant="error">{p}</Pill>;
    case "high": return <Pill variant="warn">{p}</Pill>;
    case "medium": return <Pill variant="info">{p}</Pill>;
    case "low": return <Pill variant="default">{p}</Pill>;
  }
}

function statusPill(s: Status) {
  switch (s) {
    case "open": return <Pill variant="warn">Open</Pill>;
    case "in_progress": return <Pill variant="info">In progress</Pill>;
    case "resolved": return <Pill variant="success">Resolved</Pill>;
    case "closed": return <Pill variant="default">Closed</Pill>;
  }
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleString();
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [stations, setStations] = useState<StationRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newModal, setNewModal] = useState(false);
  const [editTicket, setEditTicket] = useState<TicketRow | null>(null);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    fetchData<TicketRow[]>("/api/backend/tickets").then((d) => setTickets(d ?? []));
    fetchData<StationRef[]>("/api/backend/stations").then((d) => setStations(d ?? []));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const ms = todayStart.getTime();
    return {
      open: tickets.filter((t) => t.status === "open").length,
      inProgress: tickets.filter((t) => t.status === "in_progress").length,
      resolvedToday: tickets.filter((t) => t.status === "resolved" && t.updatedAt >= ms).length,
      critical: tickets.filter((t) => t.priority === "critical" && t.status !== "closed").length,
    };
  }, [tickets]);

  const handleDelete = (row: TicketRow) => {
    if (!confirm(`Delete ticket "${row.subject}"? This cannot be undone.`)) return;
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    fetch(`/api/backend/tickets/${row.id}`, { method: "DELETE", headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) { toast.show("success", "Ticket deleted"); load(); }
        else toast.show("error", j.message);
      });
  };

  const columns: ColumnDef<TicketRow>[] = [
    {
      key: "subject",
      header: "Ticket",
      render: (r) => (
        <div className="min-w-0">
          <div className="font-medium text-paper truncate">{r.subject}</div>
          <div className="text-[11px] text-paper-dim/70 font-mono">{r.id}</div>
        </div>
      ),
    },
    { key: "priority", header: "Priority", render: (r) => priorityPill(r.priority) },
    { key: "status", header: "Status", render: (r) => statusPill(r.status) },
    { key: "requesterName", header: "Requester", render: (r) => (
      <div className="text-sm">
        <div>{r.requesterName}</div>
        <div className="text-[11px] text-paper-dim/60">{r.requesterEmail}</div>
      </div>
    )},
    { key: "stationId", header: "Station", render: (r) => (
      <span className="text-xs text-paper-dim font-mono">{r.stationId ?? "—"}</span>
    )},
    { key: "assignee", header: "Assignee", render: (r) => (
      <span className="text-xs text-paper-dim">{r.assignee ?? "—"}</span>
    )},
    { key: "createdAt", header: "Created", render: (r) => (
      <span className="text-xs text-paper-dim">{fmtTime(r.createdAt)}</span>
    )},
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <PageHeader
        title="Support Tickets"
        subtitle="Customer issues, hardware faults, and station incidents"
        actions={
          <>
            <Button variant="ghost" size="md" onClick={load}>
              <RefreshCw size={14} /> Refresh
            </Button>
            <Button size="md" onClick={() => setNewModal(true)}>
              <Plus size={14} /> New ticket
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Open" value={stats.open} accent="from-amber-400/40 to-amber-500/10" />
        <StatCard label="In Progress" value={stats.inProgress} accent="from-[#4a63ff]/40 to-[#2447ff]/10" />
        <StatCard label="Resolved Today" value={stats.resolvedToday} accent="from-mint-400/40 to-mint-500/10" />
        <StatCard label="Critical" value={stats.critical} accent="from-ember-500/40 to-ember-600/10" />
      </div>

      <GlassCard>
        <DataTable
          columns={columns}
          data={tickets}
          rowKey={(r) => r.id}
          search={search}
          onSearchChange={setSearch}
          loading={loading}
          renderActions={(r) => (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditTicket(r)}
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
          emptyMessage={search ? "No tickets match your search" : "No tickets yet — the queue is empty"}
        />
      </GlassCard>

      <Modal open={newModal} onClose={() => setNewModal(false)} title="New support ticket">
        <TicketForm
          stations={stations}
          onSaved={() => { setNewModal(false); load(); }}
          onClose={() => setNewModal(false)}
        />
      </Modal>

      <Modal open={!!editTicket} onClose={() => setEditTicket(null)} title="Edit ticket">
        {editTicket && (
          <TicketForm
            stations={stations}
            initial={editTicket}
            onSaved={() => { setEditTicket(null); load(); }}
            onClose={() => setEditTicket(null)}
          />
        )}
      </Modal>
    </motion.div>
  );
}

interface FormProps {
  stations: StationRef[];
  initial?: TicketRow;
  onSaved: () => void;
  onClose: () => void;
}

function TicketForm({ stations, initial, onSaved, onClose }: FormProps) {
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "medium");
  const [status, setStatus] = useState<Status>(initial?.status ?? "open");
  const [stationId, setStationId] = useState(initial?.stationId ?? "");
  const [requesterName, setRequesterName] = useState(initial?.requesterName ?? "");
  const [requesterEmail, setRequesterEmail] = useState(initial?.requesterEmail ?? "");
  const [assignee, setAssignee] = useState(initial?.assignee ?? "");
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description || !requesterName || !requesterEmail) {
      toast.show("error", "Please fill all required fields");
      return;
    }
    const body = {
      subject, description, priority, status,
      requesterName, requesterEmail,
      stationId: stationId || null,
      assignee: assignee || null,
    };
    let j: { ok: boolean; message?: string };
    if (initial) {
      const res = await fetch(`/api/backend/tickets/${initial.id}`, {
        method: "PATCH", headers: authHeaders(), body: JSON.stringify(body),
      });
      j = await res.json();
    } else {
      const res = await fetch("/api/backend/tickets", {
        method: "POST", headers: authHeaders(), body: JSON.stringify(body),
      });
      j = await res.json();
    }
    if (j.ok) { toast.show("success", initial ? "Ticket updated" : "Ticket created"); onSaved(); }
    else toast.show("error", j.message ?? "Failed to save ticket");
  };

  return (
    <form onSubmit={save} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Requester name" value={requesterName} onChange={(e) => setRequesterName(e.target.value)} required />
        <TextField label="Requester email" type="email" value={requesterEmail} onChange={(e) => setRequesterEmail(e.target.value)} required />
      </div>
      <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
      <div className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
          className="rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-paper placeholder:text-paper-dim/50 focus:outline-none focus:border-[#4a63ff] focus:ring-2 focus:ring-[#4a63ff]/25 transition resize-y"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper">
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Station (optional)</span>
          <select value={stationId} onChange={(e) => setStationId(e.target.value)} className="h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper">
            <option value="">— none —</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.id} · {s.name}</option>
            ))}
          </select>
        </label>
        <TextField label="Assignee (email)" type="email" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit">{initial ? "Save changes" : "Create ticket"}</Button>
      </div>
    </form>
  );
}
