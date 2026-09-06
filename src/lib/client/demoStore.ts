"use client";

import { create } from "zustand";
import type { DemoScenario } from "@/lib/core/types";

// ---------------------------------------------------------------------------
// Demo mode state. Enabled via ?demo=1 on the URL (or remembered locally).
// The chosen scenario is attached to every API call as `x-zunex-demo`.
// ---------------------------------------------------------------------------

const SCENARIOS: { id: DemoScenario; label: string; hint: string }[] = [
  { id: "default", label: "Everything works", hint: "The full happy path" },
  { id: "station_offline", label: "Station offline", hint: "Station unavailable on entry" },
  { id: "payment_failed", label: "Payment fails", hint: "UPI verification declines" },
  { id: "start_failed", label: "Start fails", hint: "Payment ok, hardware refuses" },
  { id: "network", label: "Network drops", hint: "8s outage, then auto-recovery" },
];

const LS_KEY = "zunex:demo-scenario";

interface DemoState {
  enabled: boolean;
  scenario: DemoScenario;
  panelOpen: boolean;
  hydrated: boolean;
  /** Simulated cable state for the free-charge flow (demo mode only). */
  cableConnected: boolean;
  hydrate: (params: { demo?: boolean }) => void;
  setScenario: (scenario: DemoScenario) => void;
  setPanelOpen: (open: boolean) => void;
  setCableConnected: (connected: boolean) => void;
}

export const useDemoStore = create<DemoState>()((set, get) => ({
  enabled: false,
  scenario: "default",
  panelOpen: false,
  hydrated: false,
  cableConnected: true,
  hydrate: ({ demo }) => {
    if (get().hydrated) return;
    let scenario: DemoScenario = "default";
    try {
      const saved = localStorage.getItem(LS_KEY) as DemoScenario | null;
      if (saved) scenario = saved;
      if (demo) localStorage.setItem("zunex:demo", "1");
    } catch {
      /* storage unavailable */
    }
    let enabled = demo ?? false;
    if (!enabled) {
      try {
        enabled = localStorage.getItem("zunex:demo") === "1";
      } catch {
        /* ignore */
      }
    }
    set({ hydrated: true, enabled, scenario });
  },
  setScenario: (scenario) => {
    try {
      localStorage.setItem(LS_KEY, scenario);
    } catch {
      /* ignore */
    }
    set({ scenario, panelOpen: false });
    // Re-arm the scenario across the whole app (server reads it per request).
    window.location.reload();
  },
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setCableConnected: (cableConnected) => set({ cableConnected }),
}));

export const DEMO_SCENARIOS = SCENARIOS;
