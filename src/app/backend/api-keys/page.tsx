"use client";

import { useState } from "react";
import { KeyRound, Plus, Eye, Copy, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { Button } from "@/components/backend/Button";
import { Modal } from "@/components/backend/Modal";
import { TextField } from "@/components/backend/TextField";
import { Pill } from "@/components/backend/Pill";
import { useToast } from "@/components/backend/Toast";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsed: string;
  createdAt: string;
}

const initialKeys: ApiKey[] = [
  {
    id: "k1",
    name: "Partner Dashboard",
    key: "znx_live_a8f3k2p9v1r4s6t0m5n7",
    permissions: ["read", "write"],
    lastUsed: "2 min ago",
    createdAt: "Sep 10, 2026",
  },
  {
    id: "k2",
    name: "Monitoring Bot",
    key: "znx_live_x7y2z9b5c3d1e8f6a0g4",
    permissions: ["read"],
    lastUsed: "15 min ago",
    createdAt: "Aug 28, 2026",
  },
  {
    id: "k3",
    name: "Internal CLI",
    key: "znx_live_q1w4e7r0t3y6u9i2o5p8",
    permissions: ["read", "write", "admin"],
    lastUsed: "3 days ago",
    createdAt: "Jul 14, 2026",
  },
];

function maskKey(key: string): string {
  if (key.length <= 12) return key;
  return key.slice(0, 8) + "••••" + key.slice(-4);
}

const permLabels: Record<string, { label: string; variant: "success" | "warn" | "error" | "info" | "default" }> = {
  read: { label: "Read", variant: "info" },
  write: { label: "Write", variant: "warn" },
  admin: { label: "Admin", variant: "error" },
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>(["read"]);
  const toast = useToast();

  const toggleVisibility = (id: string) => {
    setShowValues((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const revokeKey = (id: string) => {
    const k = keys.find((x) => x.id === id);
    toast.show("error", `Revoke endpoint not wired — would revoke "${k?.name}"`);
  };

  const copyKey = (key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(key);
      toast.show("success", "Key copied to clipboard");
    }
  };

  const togglePerm = (p: string) => {
    setNewPerms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.show("error", "Please enter a key name");
      return;
    }
    // Toast simulating generation — no real API yet
    toast.show("success", `API key "${newName}" created · copied to clipboard`);
    setModalOpen(false);
    setNewName("");
    setNewPerms(["read"]);
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="API Keys"
        subtitle="Integrate with the ZUNEX backend · scoped permissions per key."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> New key
          </Button>
        }
      />

      <div className="space-y-4">
        {keys.map((k) => {
          const visible = showValues[k.id];
          return (
            <GlassCard key={k.id}>
              <div className="flex flex-wrap items-start gap-4">
                {/* Icon */}
                <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#4a63ff]/25 to-[#2447ff]/5 border border-white/10 flex items-center justify-center">
                  <KeyRound size={18} className="text-[#a9bcff]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-paper">{k.name}</h3>
                    {k.permissions.map((p) => {
                      const cfg = permLabels[p];
                      return (
                        <Pill key={p} variant={cfg.variant}>
                          {cfg.label}
                        </Pill>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-paper-dim bg-black/30 border border-white/10 rounded-lg px-3 py-1.5">
                      {visible ? k.key : maskKey(k.key)}
                    </code>
                    <button
                      onClick={() => toggleVisibility(k.id)}
                      className="p-1.5 rounded-lg text-paper-dim hover:text-paper hover:bg-white/5 transition"
                      aria-label={visible ? "Hide" : "Show"}
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => copyKey(k.key)}
                      className="p-1.5 rounded-lg text-paper-dim hover:text-paper hover:bg-white/5 transition"
                      aria-label="Copy"
                    >
                      <Copy size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-paper-dim">
                    <span>Last used: <span className="text-paper-dim">{k.lastUsed}</span></span>
                    <span>·</span>
                    <span>Created: {k.createdAt}</span>
                  </div>
                </div>

                <div className="shrink-0">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => revokeKey(k.id)}
                  >
                    <Trash2 size={14} /> Revoke
                  </Button>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Create Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Generate new API key"
      >
        <div className="space-y-4">
          <TextField
            label="Key name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Partner integration"
          />

          <div>
            <span className="text-xs uppercase tracking-wider text-paper-dim font-medium block mb-2">
              Permissions
            </span>
            <div className="space-y-2">
              {["read", "write", "admin"].map((p) => (
                <label
                  key={p}
                  className="flex items-center gap-3 rounded-xl bg-black/20 border border-white/10 px-3 py-2 cursor-pointer hover:border-white/20 transition"
                >
                  <input
                    type="checkbox"
                    checked={newPerms.includes(p)}
                    onChange={() => togglePerm(p)}
                    className="w-4 h-4 rounded border-white/20 accent-[#4a63ff]"
                  />
                  <span className="text-sm text-paper font-medium">
                    {permLabels[p].label}
                  </span>
                  {p === "admin" && (
                    <span className="text-[10px] text-ember-400">danger</span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Generate key</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
