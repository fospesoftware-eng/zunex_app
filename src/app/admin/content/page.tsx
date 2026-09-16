"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/admin/GlassCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/admin/Button";
import { TextField } from "@/components/admin/TextField";
import { useToast } from "@/components/admin/Toast";
import { getStoredToken } from "@/lib/client/adminAuth";

interface ContentForm {
  brandName: string;
  tagline: string;
  supportEmail: string;
}

export default function ContentPage() {
  const [form, setForm] = useState<ContentForm>({ brandName: "", tagline: "", supportEmail: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    fetch("/api/admin/config", { headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          const s = j.data.settings;
          setForm({ brandName: s.brandName, tagline: s.tagline, supportEmail: s.supportEmail });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    // Fetch current config so we only change these three fields
    const cur = await fetch("/api/admin/config", { headers }).then((r) => r.json());
    if (!cur.ok) { toast.show("error", "Could not read config"); setSaving(false); return; }
    const cfg = cur.data;
    cfg.settings.brandName = form.brandName;
    cfg.settings.tagline = form.tagline;
    cfg.settings.supportEmail = form.supportEmail;
    const res = await fetch("/api/admin/config", { method: "PUT", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(cfg) });
    const j = await res.json();
    if (j.ok) toast.show("success", "Content saved");
    else toast.show("error", j.message);
    setSaving(false);
  };

  if (loading) return <div className="text-sm text-paper-dim">Loading…</div>;

  return (
    <div>
      <PageHeader
        title="Content"
        subtitle="Site-level strings that feed the frontend experience."
        actions={<Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>}
      />

      <GlassCard title="Brand strings" subtitle="These appear in the public ZUNEX app.">
        <div className="space-y-4 max-w-lg">
          <TextField label="Brand name" value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} />
          <TextField label="Tagline" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          <TextField label="Support email" type="email" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} />
        </div>
      </GlassCard>
    </div>
  );
}
