"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/admin/GlassCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/admin/Button";
import { DataTable } from "@/components/admin/DataTable";
import type { ColumnDef } from "@/components/admin/DataTable";
import { Modal } from "@/components/admin/Modal";
import { TextField } from "@/components/admin/TextField";
import { NumberField } from "@/components/admin/NumberField";
import { useToast } from "@/components/admin/Toast";
import { getStoredToken } from "@/lib/client/adminAuth";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

interface StrategyRow {
  id: string;
  timeSlot: string;
  deviceRatioPct: number;
  enabled: boolean;
  createdAt: number;
}

function TimeSlotPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [start, end] = value.split("-");
  return (
    <div className="flex items-center gap-2">
      <input
        type="time"
        value={start || "09:00"}
        onChange={(e) => onChange(`${e.target.value}-${end || "10:00"}`)}
        className="h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper focus:outline-none focus:border-[#4a63ff]"
      />
      <span className="text-paper-dim text-sm">–</span>
      <input
        type="time"
        value={end || "10:00"}
        onChange={(e) => onChange(`${start || "09:00"}-${e.target.value}`)}
        className="h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper focus:outline-none focus:border-[#4a63ff]"
      />
    </div>
  );
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<StrategyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const toast = useToast();

  const load = () => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    fetch("/api/admin/strategies", { headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setStrategies(j.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggleEnabled = (s: StrategyRow) => {
    const token = getStoredToken();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers["x-zunex-admin-token"] = token;
    fetch(`/api/admin/strategies/${s.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ enabled: !s.enabled }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          toast.show("success", j.data.enabled ? "Strategy enabled" : "Strategy disabled");
          load();
        }
      });
  };

  const handleDelete = (s: StrategyRow) => {
    if (!confirm(`Delete strategy ${s.timeSlot}?`)) return;
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    fetch(`/api/admin/strategies/${s.id}`, { method: "DELETE", headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          toast.show("success", "Strategy deleted");
          load();
        }
      });
  };

  const filtered = strategies.filter(
    (s) =>
      s.timeSlot.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: ColumnDef<StrategyRow>[] = [
    {
      key: "timeSlot",
      header: "Time slot",
      render: (r) => (
        <span className="font-display text-sm font-medium tracking-tight text-paper">
          {r.timeSlot}
        </span>
      ),
    },
    {
      key: "deviceRatioPct",
      header: "Device ratio",
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-32 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${r.deviceRatioPct}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-[#4a63ff] to-[#2447ff]"
            />
          </div>
          <span className="text-sm text-paper-dim numeral">{r.deviceRatioPct}%</span>
        </div>
      ),
    },
    {
      key: "enabled",
      header: "Enabled",
      render: (r) => (
        <Toggle checked={r.enabled} onChange={() => toggleEnabled(r)} />
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (r) => (
        <span className="text-xs text-paper-dim">
          {new Date(r.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Order strategies"
        subtitle="Weight device allocation by time-of-day windows."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> New strategy
          </Button>
        }
      />

      <GlassCard>
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(r) => r.id}
          onDelete={handleDelete}
          search={search}
          onSearchChange={setSearch}
          loading={loading}
          emptyMessage="No strategies yet"
        />
      </GlassCard>

      <StrategyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
      />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? "bg-[#2447ff]" : "bg-white/10"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function StrategyModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [timeSlot, setTimeSlot] = useState("09:00-10:00");
  const [ratio, setRatio] = useState(30);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getStoredToken();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers["x-zunex-admin-token"] = token;
    const res = await fetch("/api/admin/strategies", {
      method: "POST",
      headers,
      body: JSON.stringify({ timeSlot, deviceRatioPct: ratio }),
    });
    const j = await res.json();
    if (j.ok) {
      toast.show("success", "Strategy created");
      onSaved();
    } else toast.show("error", j.message);
  };

  return (
    <Modal open={open} onClose={onClose} title="New order strategy">
      <form onSubmit={save} className="space-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Time window</span>
          <TimeSlotPicker value={timeSlot} onChange={setTimeSlot} />
        </label>
        <NumberField label="Device ratio (%)" value={ratio} onChange={(e) => setRatio(Number(e.target.value))} min={0} max={100} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Create strategy</Button>
        </div>
      </form>
    </Modal>
  );
}
