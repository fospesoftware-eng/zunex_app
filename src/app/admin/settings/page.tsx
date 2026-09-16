"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/admin/GlassCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/admin/Button";
import { NumberField } from "@/components/admin/NumberField";
import { TextField } from "@/components/admin/TextField";
import { DataTable } from "@/components/admin/DataTable";
import type { ColumnDef } from "@/components/admin/DataTable";
import { useToast } from "@/components/admin/Toast";
import { getStoredToken } from "@/lib/client/adminAuth";
import { Plus } from "lucide-react";

interface Settings {
  commissionRatePct: number;
  defaultPowerWatts: number;
  commonConfig: Record<string, string | number | boolean>;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
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
          setSettings({
            commissionRatePct: j.data.settings.commissionRatePct,
            defaultPowerWatts: j.data.settings.defaultPowerWatts,
            commonConfig: j.data.settings.commonConfig,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (partial: Partial<Settings>) => {
    setSaving(true);
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    const cur = await fetch("/api/admin/config", { headers }).then((r) => r.json());
    if (!cur.ok) { toast.show("error", "Could not read config"); setSaving(false); return; }
    const cfg = cur.data;
    if (partial.commissionRatePct !== undefined) cfg.settings.commissionRatePct = partial.commissionRatePct;
    if (partial.defaultPowerWatts !== undefined) cfg.settings.defaultPowerWatts = partial.defaultPowerWatts;
    if (partial.commonConfig !== undefined) cfg.settings.commonConfig = partial.commonConfig;
    const res = await fetch("/api/admin/config", { method: "PUT", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(cfg) });
    const j = await res.json();
    if (j.ok) toast.show("success", "Settings saved");
    else toast.show("error", j.message);
    setSaving(false);
  };

  const addCommon = () => {
    if (!settings) return;
    const key = prompt("Key?");
    if (!key) return;
    const val = prompt("Value?", "1");
    if (val === null) return;
    const parsed: string | number | boolean = val === "true" ? true : val === "false" ? false : !isNaN(Number(val)) ? Number(val) : val;
    const next = { ...settings.commonConfig, [key]: parsed };
    setSettings({ ...settings, commonConfig: next });
    save({ commonConfig: next });
  };

  const deleteCommon = (key: string) => {
    if (!settings) return;
    const next = { ...settings.commonConfig };
    delete next[key];
    setSettings({ ...settings, commonConfig: next });
    save({ commonConfig: next });
  };

  if (loading || !settings) return <div className="text-sm text-paper-dim">Loading…</div>;

  const commonRows = Object.entries(settings.commonConfig).map(([k, v]) => ({ key: k, value: String(v) }));

  const columns: ColumnDef<{ key: string; value: string }>[] = [
    { key: "key", header: "Key", render: (r) => <code className="text-[#a9bcff] text-xs font-mono">{r.key}</code> },
    { key: "value", header: "Value" },
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle="System-wide configuration for the ZUNEX network." />

      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard title="Business defaults">
          <div className="space-y-5 max-w-md">
            <div>
              <label className="text-xs uppercase tracking-wider text-paper-dim font-medium">Commission rate</label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={1}
                  value={settings.commissionRatePct}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSettings({ ...settings, commissionRatePct: v });
                  }}
                  onMouseUp={(e) => save({ commissionRatePct: Number((e.target as HTMLInputElement).value) })}
                  className="flex-1 accent-[#4a63ff]"
                />
                <span className="font-display text-lg font-semibold numeral text-paper w-12 text-right">{settings.commissionRatePct}%</span>
              </div>
            </div>
            <NumberField
              label="Default power (W)"
              value={settings.defaultPowerWatts}
              onChange={(e) => {
                const v = Number(e.target.value);
                setSettings({ ...settings, defaultPowerWatts: v });
              }}
            />
            <Button onClick={() => save({ defaultPowerWatts: settings.defaultPowerWatts })} disabled={saving}>
              Save
            </Button>
          </div>
        </GlassCard>

        <GlassCard
          title="Common config"
          subtitle="Arbitrary key/value pairs consumed by frontend and backend."
        >
          <div className="flex justify-end mb-3">
            <Button variant="ghost" size="sm" onClick={addCommon}>
              <Plus size={14} /> Add entry
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={commonRows}
            rowKey={(r) => r.key}
            onDelete={(r) => deleteCommon(r.key)}
            emptyMessage="No entries yet"
          />
        </GlassCard>
      </div>

      <GlassCard title="Advanced" className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="danger" onClick={() => {
            if (!confirm("Clear in-memory session/cache state? This does not touch station firmware.")) return;
            toast.show("success", "Cache cleared");
            setTimeout(() => window.location.reload(), 400);
          }}>
            Clear cache
          </Button>
          <span className="text-xs text-paper-dim">
            Resets the in-memory live store only. Persisted config stays.
          </span>
        </div>
      </GlassCard>
    </div>
  );
}
