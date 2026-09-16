"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/admin/GlassCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/admin/Button";
import { DataTable } from "@/components/admin/DataTable";
import type { ColumnDef } from "@/components/admin/DataTable";
import { Modal } from "@/components/admin/Modal";
import { TextField } from "@/components/admin/TextField";
import { Pill } from "@/components/admin/Pill";
import { useToast } from "@/components/admin/Toast";
import { getStoredToken } from "@/lib/client/adminAuth";
import { Plus } from "lucide-react";

interface AdminRow {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  lastLoginAt: number | null;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const toast = useToast();

  const load = () => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    fetch("/api/admin/admins", { headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setAdmins(j.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const toggleRole = (a: AdminRow, newRole: string) => {
    const token = getStoredToken();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers["x-zunex-admin-token"] = token;
    fetch(`/api/admin/admins/${a.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ role: newRole }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) { toast.show("success", "Role updated"); load(); }
      });
  };

  const handleDelete = (a: AdminRow) => {
    if (!confirm(`Remove admin ${a.name}?`)) return;
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    fetch(`/api/admin/admins/${a.id}`, { method: "DELETE", headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) { toast.show("success", "Admin removed"); load(); }
        else toast.show("error", j.message);
      });
  };

  const filtered = admins.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: ColumnDef<AdminRow>[] = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "role",
      header: "Role",
      render: (r) => (
        <select
          value={r.role}
          onChange={(e) => toggleRole(r, e.target.value)}
          disabled={r.role === "super_admin"}
          className="h-8 rounded-lg bg-black/30 border border-white/10 px-2 text-xs text-paper disabled:opacity-60"
        >
          <option value="super_admin">Super admin</option>
          <option value="admin">Admin</option>
          <option value="viewer">Viewer</option>
        </select>
      ),
    },
    {
      key: "active",
      header: "Active",
      render: (r) => (
        <Pill variant={r.active ? "success" : "default"}>{r.active ? "Active" : "Inactive"}</Pill>
      ),
    },
    {
      key: "lastLoginAt",
      header: "Last login",
      render: (r) =>
        r.lastLoginAt ? (
          <span className="text-xs text-paper-dim">{new Date(r.lastLoginAt).toLocaleString()}</span>
        ) : (
          <span className="text-xs text-paper-dim/50">Never</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Admin users"
        subtitle="Team members with access to this panel."
        actions={<Button onClick={() => setModalOpen(true)}><Plus size={16} /> Add user</Button>}
      />
      <GlassCard>
        <DataTable
          columns={columns}
          data={filtered}
          rowKey={(r) => r.id}
          search={search}
          onSearchChange={setSearch}
          loading={loading}
          onDelete={handleDelete}
          emptyMessage="No admin users"
        />
      </GlassCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add admin user">
        <AdminForm onSaved={() => { setModalOpen(false); load(); }} onClose={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
}

function AdminForm({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getStoredToken();
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers["x-zunex-admin-token"] = token;
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers,
      body: JSON.stringify({ name, email, role }),
    });
    const j = await res.json();
    if (j.ok) { toast.show("success", "Admin added"); onSaved(); }
    else toast.show("error", j.message);
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-wider text-paper-dim font-medium">Role</span>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-10 rounded-xl bg-black/30 border border-white/10 px-3 text-sm text-paper">
          <option value="admin">Admin</option>
          <option value="viewer">Viewer</option>
          <option value="super_admin">Super admin</option>
        </select>
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit">Add user</Button>
      </div>
    </form>
  );
}
