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
import { Pill } from "@/components/admin/Pill";
import { useToast } from "@/components/admin/Toast";
import { getStoredToken } from "@/lib/client/adminAuth";
import { Plus } from "lucide-react";

interface PartnerRow {
  id: string;
  name: string;
  type: string;
  contactName: string;
  contactEmail: string;
  stationsOwned: number;
  commissionRatePct: number;
  active: boolean;
  joinedAt: number;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const toast = useToast();

  const load = () => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    fetch("/api/admin/partners", { headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setPartners(j.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const toggleActive = (p: PartnerRow) => {
    const token = getStoredToken();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers["x-zunex-admin-token"] = token;
    fetch(`/api/admin/partners/${p.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ active: !p.active }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          toast.show("success", j.data.active ? "Partner enabled" : "Partner disabled");
          load();
        }
      });
  };

  const handleDelete = (p: PartnerRow) => {
    if (!confirm(`Remove partner ${p.name}?`)) return;
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    fetch(`/api/admin/partners/${p.id}`, { method: "DELETE", headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          toast.show("success", "Partner removed");
          load();
        }
      });
  };

  const filtered = partners.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.contactEmail.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: ColumnDef<PartnerRow>[] = [
    { key: "name", header: "Partner" },
    { key: "type", header: "Type", render: (r) => <Pill variant="info">{r.type}</Pill> },
    { key: "stationsOwned", header: "Stations", render: (r) => r.stationsOwned },
    { key: "commissionRatePct", header: "Commission", render: (r) => `${r.commissionRatePct}%` },
    {
      key: "active",
      header: "Active",
      render: (r) => <Pill variant={r.active ? "success" : "default"}>{r.active ? "Active" : "Paused"}</Pill>,
    },
    {
      key: "joinedAt",
      header: "Joined",
      render: (r) => <span className="text-xs text-paper-dim">{new Date(r.joinedAt).toLocaleDateString()}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Partners"
        subtitle="Ecosystem operators running ZUNEX stations."
        actions={<Button onClick={() => setModalOpen(true)}><Plus size={16} /> Add partner</Button>}
      />
      <GlassCard>
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(r) => r.id}
          search={search}
          onSearchChange={setSearch}
          loading={loading}
          renderActions={(r) => (
            <>
              <button onClick={() => toggleActive(r)} className="p-1.5 rounded-lg text-paper-dim hover:text-paper hover:bg-white/8 transition">
                {r.active ? "⏸" : "▶"}
              </button>
              <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg text-paper-dim hover:text-ember-400 hover:bg-ember-500/10 transition">
                ✕
              </button>
            </>
          )}
          emptyMessage="No partners yet"
        />
      </GlassCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add partner">
        <PartnerForm onSaved={() => { setModalOpen(false); load(); }} onClose={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}

function PartnerForm({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("merchant");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [stationsOwned, setStations] = useState(0);
  const [commissionRatePct, setCommission] = useState(20);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getStoredToken();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers["x-zunex-admin-token"] = token;
    const res = await fetch("/api/admin/partners", {
      method: "POST",
      headers,
      body: JSON.stringify({ name, type, contactName, contactEmail, stationsOwned, commissionRatePct }),
    });
    const j = await res.json();
    if (j.ok) {
      toast.show("success", "Partner added");
      onSaved();
    } else toast.show("error", j.message);
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Type</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper focus:outline-none focus:border-[#4a63ff]"
          >
            <option value="merchant">Merchant</option>
            <option value="enterprise">Enterprise</option>
            <option value="fleet">Fleet</option>
            <option value="institution">Institution</option>
          </select>
        </label>
      </div>
      <TextField label="Contact name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
      <TextField label="Contact email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
      <div className="grid grid-cols-2 gap-4">
        <NumberField label="Stations owned" value={stationsOwned} onChange={(e) => setStations(Number(e.target.value))} />
        <NumberField label="Commission %" value={commissionRatePct} onChange={(e) => setCommission(Number(e.target.value))} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit">Add partner</Button>
      </div>
    </form>
  );
}
