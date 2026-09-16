"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { Button } from "@/components/backend/Button";
import { DataTable } from "@/components/backend/DataTable";
import type { ColumnDef } from "@/components/backend/DataTable";
import { Pill } from "@/components/backend/Pill";
import { Modal } from "@/components/backend/Modal";
import { TextField } from "@/components/backend/TextField";
import { NumberField } from "@/components/backend/NumberField";
import { useToast } from "@/components/backend/Toast";
import { getStoredToken } from "@/lib/client/backendAuth";
import { Plus } from "lucide-react";

interface StationRow {
  id: string;
  name: string;
  location: string;
  powerWatts: number;
  connector: string;
  liveStatus: "available" | "busy" | "offline" | "maintenance";
  baseStatus: "available" | "maintenance" | "offline";
  forceStatus: "available" | "offline" | "busy" | null;
}

const statusVariant: Record<StationRow["liveStatus"], "success" | "warn" | "error" | "info"> = {
  available: "success",
  busy: "warn",
  offline: "error",
  maintenance: "info",
};

export default function StationsPage() {
  const [stations, setStations] = useState<StationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StationRow | null>(null);
  const [search, setSearch] = useState("");
  const toast = useToast();

  const load = () => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    fetch("/api/backend/stations", { headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setStations(j.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = stations.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.location.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (s: StationRow) => {
    setEditing(s);
    setModalOpen(true);
  };

  const handleDelete = (s: StationRow) => {
    if (!confirm(`Delete station ${s.id}?`)) return;
    const token = getStoredToken();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers["x-zunex-admin-token"] = token;
    fetch(`/api/admin/stations/${s.id}`, { method: "DELETE", headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          toast.show("success", "Station deleted");
          load();
        } else toast.show("error", j.message);
      });
  };

  const columns: ColumnDef<StationRow>[] = [
    { key: "id", header: "ID" },
    { key: "name", header: "Name" },
    {
      key: "liveStatus",
      header: "Status",
      render: (r) => <Pill variant={statusVariant[r.liveStatus]}>{r.liveStatus}</Pill>,
    },
    { key: "location", header: "Location" },
    { key: "connector", header: "Connector" },
    { key: "powerWatts", header: "Power", render: (r) => `${r.powerWatts} W` },
  ];

  return (
    <div>
      <PageHeader
        title="Stations"
        subtitle="Manage every ZUNEX port on the network."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} /> New station
          </Button>
        }
      />
      <GlassCard>
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(r) => r.id}
          onEdit={openEdit}
          onDelete={handleDelete}
          search={search}
          onSearchChange={setSearch}
          loading={loading}
          emptyMessage="No stations yet"
        />
      </GlassCard>

      <StationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
        initial={editing}
      />
    </div>
  );
}

function StationModal({
  open,
  onClose,
  onSaved,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial: StationRow | null;
}) {
  const [form, setForm] = useState({
    id: "",
    name: "",
    location: "",
    powerWatts: 30,
    connector: "USB-C",
  });
  const toast = useToast();

  useEffect(() => {
    if (initial) {
      setForm({
        id: initial.id,
        name: initial.name,
        location: initial.location,
        powerWatts: initial.powerWatts,
        connector: initial.connector,
      });
    } else {
      setForm({ id: "", name: "", location: "", powerWatts: 30, connector: "USB-C" });
    }
  }, [initial, open]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getStoredToken();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers["x-zunex-admin-token"] = token;
    const method = initial ? "PATCH" : "POST";
    const url = initial ? `/api/admin/stations/${initial.id}` : "/api/backend/stations";
    const body = initial
      ? { name: form.name, location: form.location, powerWatts: form.powerWatts, connector: form.connector }
      : form;
    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    const j = await res.json();
    if (j.ok) {
      toast.show("success", initial ? "Station updated" : "Station created");
      onSaved();
    } else toast.show("error", j.message);
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit station" : "New station"}>
      <form onSubmit={save} className="space-y-4">
        {!initial && <TextField label="ID" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="ZNX-NEW" required />}
        <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <TextField label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Power (W)" value={form.powerWatts} onChange={(e) => setForm({ ...form, powerWatts: Number(e.target.value) })} />
          <TextField label="Connector" value={form.connector} onChange={(e) => setForm({ ...form, connector: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">{initial ? "Save changes" : "Create station"}</Button>
        </div>
      </form>
    </Modal>
  );
}
