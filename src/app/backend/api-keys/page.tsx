"use client";

import { useEffect, useState } from "react";
import { KeyRound, Plus, Copy, Trash2, TriangleAlert } from "lucide-react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { Button } from "@/components/backend/Button";
import { Modal } from "@/components/backend/Modal";
import { TextField } from "@/components/backend/TextField";
import { Pill } from "@/components/backend/Pill";
import { useToast } from "@/components/backend/Toast";
import { getAccessToken } from "@/lib/client/backendAuth";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  last_used_at: number | null;
  revoked: boolean;
  created_at: number;
}

const permLabels: Record<string, { label: string; variant: "success" | "warn" | "error" | "info" | "default" }> = {
  read: { label: "Read", variant: "info" },
  write: { label: "Write", variant: "warn" },
  admin: { label: "Admin", variant: "error" },
};

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(ts).toLocaleDateString();
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

async function authHeaders(json = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (json) headers["content-type"] = "application/json";
  const token = await getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>(["read"]);
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<{ name: string; fullKey: string } | null>(null);
  const toast = useToast();

  const load = async () => {
    const res = await fetch("/api/backend/api-keys", { headers: await authHeaders() });
    const j = await res.json();
    if (j.ok) setKeys(j.data as ApiKey[]);
    else toast.show("error", j.message ?? "Failed to load API keys");
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revokeKey = async (k: ApiKey) => {
    if (!confirm(`Revoke key "${k.name}"? Clients using it will lose access immediately.`)) return;
    const res = await fetch(`/api/backend/api-keys/${k.id}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    const j = await res.json();
    if (j.ok) {
      toast.show("success", `Key "${k.name}" revoked`);
      load();
    } else {
      toast.show("error", j.message ?? "Failed to revoke key");
    }
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

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.show("error", "Please enter a key name");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/backend/api-keys", {
        method: "POST",
        headers: await authHeaders(true),
        body: JSON.stringify({ name: newName.trim(), permissions: newPerms }),
      });
      const j = await res.json();
      if (!j.ok) {
        toast.show("error", j.message ?? "Failed to create key");
        return;
      }
      setModalOpen(false);
      setCreatedKey({ name: j.data.name, fullKey: j.data.fullKey });
      setNewName("");
      setNewPerms(["read"]);
      load();
    } finally {
      setCreating(false);
    }
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
        {keys.map((k) => (
          <GlassCard key={k.id} className={k.revoked ? "opacity-60" : ""}>
            <div className="flex flex-wrap items-start gap-4">
              {/* Icon */}
              <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#4a63ff]/25 to-[#2447ff]/5 border border-white/10 flex items-center justify-center">
                <KeyRound size={18} className="text-[#a9bcff]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-paper">{k.name}</h3>
                  {k.permissions.map((p) => {
                    const cfg = permLabels[p] ?? { label: p, variant: "default" as const };
                    return (
                      <Pill key={p} variant={cfg.variant}>
                        {cfg.label}
                      </Pill>
                    );
                  })}
                  {k.revoked && <Pill variant="error">Revoked</Pill>}
                </div>

                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-paper-dim bg-black/30 border border-white/10 rounded-lg px-3 py-1.5">
                    {k.key_prefix}••••
                  </code>
                </div>

                <div className="flex items-center gap-3 mt-2 text-[11px] text-paper-dim">
                  <span>
                    Last used:{" "}
                    <span className="text-paper-dim">
                      {k.last_used_at ? relTime(k.last_used_at) : "Never"}
                    </span>
                  </span>
                  <span>·</span>
                  <span>Created: {fmtDate(k.created_at)}</span>
                </div>
              </div>

              {!k.revoked && (
                <div className="shrink-0">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => revokeKey(k)}
                  >
                    <Trash2 size={14} /> Revoke
                  </Button>
                </div>
              )}
            </div>
          </GlassCard>
        ))}

        {keys.length === 0 && (
          <GlassCard>
            <div className="py-8 text-center text-sm text-paper-dim">
              No API keys yet — generate one to get started.
            </div>
          </GlassCard>
        )}
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
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Generating…" : "Generate key"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* One-time full key reveal */}
      <Modal
        open={createdKey !== null}
        onClose={() => setCreatedKey(null)}
        title="API key created"
      >
        {createdKey && (
          <div className="space-y-4">
            <p className="text-sm text-paper-dim">
              <span className="text-paper font-medium">{createdKey.name}</span> is ready.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-mint-400 bg-black/30 border border-mint-400/20 rounded-lg px-3 py-2.5 break-all">
                {createdKey.fullKey}
              </code>
              <Button size="sm" variant="ghost" onClick={() => copyKey(createdKey.fullKey)}>
                <Copy size={14} /> Copy
              </Button>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-ember-500/30 bg-ember-500/10 px-3 py-2.5">
              <TriangleAlert size={15} className="text-ember-400 shrink-0 mt-0.5" />
              <p className="text-xs text-ember-400">
                Store it now — it won't be shown again. Only the hash is kept on our servers.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setCreatedKey(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
