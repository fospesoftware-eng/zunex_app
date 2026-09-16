"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { Button } from "@/components/backend/Button";
import { DataTable } from "@/components/backend/DataTable";
import type { ColumnDef } from "@/components/backend/DataTable";
import { useToast } from "@/components/backend/Toast";
import { getStoredToken } from "@/lib/client/backendAuth";
import { Plus, Eye, EyeOff, Check, CircleDot } from "lucide-react";

type GatewayActive = "cashfree" | "razorpay" | "none";

interface PaymentGateways {
  active: GatewayActive;
  cashfree: { appId: string; secretKey: string; sandbox: boolean };
  razorpay: { keyId: string; keySecret: string; sandbox: boolean };
}

interface Settings {
  commissionRatePct: number;
  defaultPowerWatts: number;
  commonConfig: Record<string, string | number | boolean>;
  paymentGateways: PaymentGateways;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const toast = useToast();

  useEffect(() => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    fetch("/api/backend/config", { headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setSettings({
            commissionRatePct: j.data.settings.commissionRatePct,
            defaultPowerWatts: j.data.settings.defaultPowerWatts,
            commonConfig: j.data.settings.commonConfig,
            paymentGateways: j.data.settings.paymentGateways ?? {
              active: "razorpay",
              cashfree: { appId: "", secretKey: "", sandbox: true },
              razorpay: { keyId: "", keySecret: "", sandbox: true },
            },
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
    const cur = await fetch("/api/backend/config", { headers }).then((r) => r.json());
    if (!cur.ok) { toast.show("error", "Could not read config"); setSaving(false); return; }
    const cfg = cur.data;
    if (partial.commissionRatePct !== undefined) cfg.settings.commissionRatePct = partial.commissionRatePct;
    if (partial.defaultPowerWatts !== undefined) cfg.settings.defaultPowerWatts = partial.defaultPowerWatts;
    if (partial.commonConfig !== undefined) cfg.settings.commonConfig = partial.commonConfig;
    if (partial.paymentGateways !== undefined) cfg.settings.paymentGateways = partial.paymentGateways;
    const res = await fetch("/api/backend/config", { method: "PUT", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(cfg) });
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

  const pg = settings.paymentGateways;

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
            <div>
              <label className="text-xs uppercase tracking-wider text-paper-dim font-medium">Default power (W)</label>
              <div className="mt-2 flex gap-3">
                <input
                  type="number"
                  value={settings.defaultPowerWatts}
                  onChange={(e) => setSettings({ ...settings, defaultPowerWatts: Number(e.target.value) })}
                  className="flex-1 h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-paper focus:outline-none focus:border-[#4a63ff]/60"
                />
                <Button onClick={() => save({ defaultPowerWatts: settings.defaultPowerWatts })} disabled={saving}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* ====== PAYMENT GATEWAY SETTINGS ====== */}
        <GlassCard title="Payment gateway" subtitle="Integrate Cashfree or Razorpay for checkout payments.">
          <div className="space-y-4">
            {/* Active selector */}
            <div>
              <label className="text-xs uppercase tracking-wider text-paper-dim font-medium">Active gateway</label>
              <div className="mt-2 flex gap-2">
                {([
                  { value: "razorpay", label: "Razorpay", hint: "Fastest-growing Indian PG" },
                  { value: "cashfree", label: "Cashfree", hint: "UPI-first, enterprise-ready" },
                  { value: "none", label: "None", hint: "Payments disabled" },
                ] as const).map((opt) => {
                  const active = pg.active === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setSettings({ ...settings, paymentGateways: { ...pg, active: opt.value } })}
                      className={`flex-1 text-left px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                        active
                          ? "border-[#4a63ff]/50 bg-[rgba(36,71,255,0.12)]"
                          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {active ? (
                          <Check size={14} className="text-[#a9bcff]" />
                        ) : (
                          <CircleDot size={14} className="text-paper-dim" />
                        )}
                        <span className="text-[13px] font-semibold text-white">{opt.label}</span>
                      </div>
                      <div className="text-[10px] text-paper-dim/60 mt-1">{opt.hint}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Razorpay config */}
            <div className={`rounded-xl border p-4 transition ${pg.active === "razorpay" ? "border-[#4a63ff]/40 bg-[rgba(36,71,255,0.06)]" : "border-white/10 bg-white/[0.02]"}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[13px] font-semibold text-white">Razorpay</div>
                  <div className="text-[10px] text-paper-dim/60">keyId · keySecret</div>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-paper-dim cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pg.razorpay.sandbox}
                    onChange={(e) => {
                      const rz = { ...pg.razorpay, sandbox: e.target.checked };
                      setSettings({ ...settings, paymentGateways: { ...pg, razorpay: rz } });
                    }}
                    className="accent-[#4a63ff]"
                  />
                  Sandbox mode
                </label>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-paper-dim/70 uppercase tracking-wider">Key ID</label>
                  <input
                    value={pg.razorpay.keyId}
                    placeholder="rzp_test_… or rzp_live_…"
                    onChange={(e) => {
                      const rz = { ...pg.razorpay, keyId: e.target.value };
                      setSettings({ ...settings, paymentGateways: { ...pg, razorpay: rz } });
                    }}
                    className="mt-1 w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-paper placeholder:text-paper-dim/40 focus:outline-none focus:border-[#4a63ff]/60"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-paper-dim/70 uppercase tracking-wider">Key Secret</label>
                  <div className="mt-1 relative">
                    <input
                      type={visibleSecrets.rz_secret ? "text" : "password"}
                      value={pg.razorpay.keySecret}
                      placeholder="••••••••••••"
                      onChange={(e) => {
                        const rz = { ...pg.razorpay, keySecret: e.target.value };
                        setSettings({ ...settings, paymentGateways: { ...pg, razorpay: rz } });
                      }}
                      className="w-full h-9 px-3 pr-10 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-paper placeholder:text-paper-dim/40 focus:outline-none focus:border-[#4a63ff]/60"
                    />
                    <button
                      type="button"
                      onClick={() => setVisibleSecrets((v) => ({ ...v, rz_secret: !v.rz_secret }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-paper-dim hover:text-white p-1"
                    >
                      {visibleSecrets.rz_secret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cashfree config */}
            <div className={`rounded-xl border p-4 transition ${pg.active === "cashfree" ? "border-[#4a63ff]/40 bg-[rgba(36,71,255,0.06)]" : "border-white/10 bg-white/[0.02]"}`}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[13px] font-semibold text-white">Cashfree</div>
                  <div className="text-[10px] text-paper-dim/60">appId · secretKey</div>
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-paper-dim cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pg.cashfree.sandbox}
                    onChange={(e) => {
                      const cf = { ...pg.cashfree, sandbox: e.target.checked };
                      setSettings({ ...settings, paymentGateways: { ...pg, cashfree: cf } });
                    }}
                    className="accent-[#4a63ff]"
                  />
                  Sandbox mode
                </label>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-paper-dim/70 uppercase tracking-wider">App ID</label>
                  <input
                    value={pg.cashfree.appId}
                    placeholder="app_…"
                    onChange={(e) => {
                      const cf = { ...pg.cashfree, appId: e.target.value };
                      setSettings({ ...settings, paymentGateways: { ...pg, cashfree: cf } });
                    }}
                    className="mt-1 w-full h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-paper placeholder:text-paper-dim/40 focus:outline-none focus:border-[#4a63ff]/60"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-paper-dim/70 uppercase tracking-wider">Secret Key</label>
                  <div className="mt-1 relative">
                    <input
                      type={visibleSecrets.cf_secret ? "text" : "password"}
                      value={pg.cashfree.secretKey}
                      placeholder="••••••••••••"
                      onChange={(e) => {
                        const cf = { ...pg.cashfree, secretKey: e.target.value };
                        setSettings({ ...settings, paymentGateways: { ...pg, cashfree: cf } });
                      }}
                      className="w-full h-9 px-3 pr-10 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-paper placeholder:text-paper-dim/40 focus:outline-none focus:border-[#4a63ff]/60"
                    />
                    <button
                      type="button"
                      onClick={() => setVisibleSecrets((v) => ({ ...v, cf_secret: !v.cf_secret }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-paper-dim hover:text-white p-1"
                    >
                      {visibleSecrets.cf_secret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={() => save({ paymentGateways: pg })} disabled={saving}>
              Save gateway settings
            </Button>
          </div>
        </GlassCard>
      </div>

      <GlassCard
        title="Common config"
        subtitle="Arbitrary key/value pairs consumed by frontend and backend."
        className="mt-6"
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
