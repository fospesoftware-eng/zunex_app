"use client";

import { useEffect, useState } from "react";
import {
  Car,
  Building2,
  ShoppingBag,
  Mountain,
  Navigation,
  Building,
  MapPin,
} from "lucide-react";
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

const modelBg: Record<DeviceModel, string> = {
  core: "bg-[#4a63ff] text-white border-[#4a63ff]",
  plus: "bg-[#a855f7] text-white border-[#a855f7]",
};

const installIconMap: Record<InstallType, typeof Car> = {
  car: Car, mall: Building2, retail: ShoppingBag, outdoor: Mountain, highway: Navigation, office: Building,
};

const installLabelMap: Record<InstallType, string> = {
  car: "Car", mall: "Mall", retail: "Retail", outdoor: "Outdoor", highway: "Highway", office: "Office",
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
        if (j.ok) {
          const data = (j.data as StationRow[]).map((s) => ({
            ...s,
            deviceModel: s.deviceModel ?? "core",
            installType: s.installType ?? "office",
            city: s.city ?? "",
            state: s.state ?? "",
            lat: s.lat ?? 0,
            lng: s.lng ?? 0,
          }));
          setStations(data);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = stations
    .filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.location.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase()) ||
        s.city.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const order = { available: 0, busy: 1, offline: 2, maintenance: 3 } as const;
      return order[a.liveStatus] - order[b.liveStatus];
    });

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (s: StationRow) => { setEditing(s); setModalOpen(true); };

  const handleDelete = (s: StationRow) => {
    if (!confirm(`Delete station ${s.id}?`)) return;
    const token = getStoredToken();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers["x-zunex-admin-token"] = token;
    fetch(`/api/backend/stations/${s.id}`, { method: "DELETE", headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) { toast.show("success", "Station deleted"); load(); }
        else toast.show("error", j.message);
      });
  };

  const columns: ColumnDef<StationRow>[] = [
    { key: "id", header: "ID" },
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <div>
          <div className="font-medium text-paper">{r.name}</div>
          {(r.city || r.state) && (
            <div className="flex items-center gap-1 text-[11px] text-paper-dim">
              <MapPin size={10} /> {r.city}{r.state ? `, ${r.state}` : ""}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "liveStatus",
      header: "Status",
      render: (r) => <Pill variant={statusVariant[r.liveStatus]}>{r.liveStatus}</Pill>,
    },
    {
      key: "deviceModel",
      header: "Device",
      render: (r) => (
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${modelBg[r.deviceModel]}`}>
          {r.deviceModel}
        </span>
      ),
    },
    {
      key: "installType",
      header: "Install",
      render: (r) => {
        const Ic = installIconMap[r.installType];
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-paper-dim">
            <Ic size={12} /> {installLabelMap[r.installType]}
          </span>
        );
      },
    },
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
        onSaved={() => { setModalOpen(false); load(); }}
        initial={editing}
      />
    </div>
  );
}

function StationModal({
  open, onClose, onSaved, initial,
}: {
  open: boolean; onClose: () => void; onSaved: () => void; initial: StationRow | null;
}) {
  const [form, setForm] = useState({
    id: "", name: "", location: "", city: "", state: "",
    powerWatts: 30, connector: "USB-C",
    deviceModel: "core" as DeviceModel, installType: "office" as InstallType,
    lat: 0, lng: 0,
  });
  const toast = useToast();

  useEffect(() => {
    if (initial) {
      setForm({
        id: initial.id, name: initial.name, location: initial.location,
        city: initial.city, state: initial.state,
        powerWatts: initial.powerWatts, connector: initial.connector,
        deviceModel: initial.deviceModel, installType: initial.installType,
        lat: initial.lat, lng: initial.lng,
      });
    } else {
      setForm({ id: "", name: "", location: "", city: "", state: "", powerWatts: 30, connector: "USB-C", deviceModel: "core", installType: "office", lat: 0, lng: 0 });
    }
  }, [initial, open]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getStoredToken();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers["x-zunex-admin-token"] = token;
    const method = initial ? "PATCH" : "POST";
    const url = initial ? `/api/backend/stations/${initial.id}` : "/api/backend/stations";
    const body = initial
      ? { name: form.name, location: form.location, powerWatts: form.powerWatts, connector: form.connector, city: form.city, state: form.state, deviceModel: form.deviceModel, installType: form.installType, lat: Number(form.lat), lng: Number(form.lng) }
      : form;
    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    const j = await res.json();
    if (j.ok) { toast.show("success", initial ? "Station updated" : "Station created"); onSaved(); }
    else toast.show("error", j.message);
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit station" : "New station"}>
      <form onSubmit={save} className="space-y-4">
        {!initial && <TextField label="ID" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="ZNX-NEW" required />}
        <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <TextField label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
        <div className="grid grid-cols-2 gap-4">
          <TextField label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <TextField label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Lat" value={form.lat} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} step={0.0001} />
          <NumberField label="Lng" value={form.lng} onChange={(e) => setForm({ ...form, lng: Number(e.target.value) })} step={0.0001} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <NumberField label="Power (W)" value={form.powerWatts} onChange={(e) => setForm({ ...form, powerWatts: Number(e.target.value) })} />
          <TextField label="Connector" value={form.connector} onChange={(e) => setForm({ ...form, connector: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Device Model</span>
            <select
              value={form.deviceModel}
              onChange={(e) => setForm({ ...form, deviceModel: e.target.value as DeviceModel })}
              className="h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper"
            >
              <option value="core">Core (1-port)</option>
              <option value="plus">Plus (2-port)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Install Type</span>
            <select
              value={form.installType}
              onChange={(e) => setForm({ ...form, installType: e.target.value as InstallType })}
              className="h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper"
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
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">{initial ? "Save changes" : "Create station"}</Button>
        </div>
      </form>
    </Modal>
  );
}
