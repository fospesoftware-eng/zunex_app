"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/backend/GlassCard";
import { PageHeader } from "@/components/backend/PageHeader";
import { Pill } from "@/components/backend/Pill";
import { useToast } from "@/components/backend/Toast";
import { getStoredToken } from "@/lib/client/backendAuth";

interface Plan {
  id: string;
  minutes: number;
  pricePaise: number;
  label: string;
  tagline: string;
}

export default function PricingPage() {
  const [activeTab, setActiveTab] = useState<"charging" | "free" | "wifi">("charging");
  const [plans, setPlans] = useState<{ PLANS: Plan[]; FREE_PLANS: Plan[]; WIFI_PLANS: Plan[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers["x-zunex-admin-token"] = token;
    fetch("/api/backend/plans", { headers })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setPlans(j.data);
      })
      .catch(() => toast.show("error", "Failed to load pricing"))
      .finally(() => setLoading(false));
  }, [toast]);

  const tabs = [
    { key: "charging" as const, label: "Charging plans" },
    { key: "free" as const, label: "Free plans" },
    { key: "wifi" as const, label: "WiFi plans" },
  ];

  const list =
    activeTab === "charging"
      ? plans?.PLANS
      : activeTab === "free"
        ? plans?.FREE_PLANS
        : plans?.WIFI_PLANS;

  return (
    <div>
      <PageHeader
        title="Pricing"
        subtitle="Plan catalogue inherited from the server store. Edit here in phase 2."
      />

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === t.key
                ? "bg-gradient-to-br from-[#4a63ff] to-[#2447ff] text-white shadow-[0_8px_24px_-8px_rgba(36,71,255,0.6)]"
                : "text-paper-dim hover:text-paper"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <GlassCard>
        {loading ? (
          <div className="text-sm text-paper-dim text-center py-8">Loading…</div>
        ) : !list || list.length === 0 ? (
          <div className="text-sm text-paper-dim text-center py-8">No plans.</div>
        ) : (
          <div className="space-y-3">
            {list.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.05] transition"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#4a63ff]/40 to-[#2447ff]/10 border border-[#4a63ff]/30 flex items-center justify-center font-display font-semibold text-[#a9bcff]">
                    {p.label[0]}
                  </div>
                  <div>
                    <div className="font-medium text-paper">{p.label}</div>
                    <div className="text-xs text-paper-dim">{p.tagline}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-xl font-semibold text-paper numeral">
                    ₹{(p.pricePaise / 100).toFixed(0)}
                  </div>
                  <div className="text-xs text-paper-dim">
                    {p.minutes > 0 ? `${p.minutes} min · ` : ""}
                    {p.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
