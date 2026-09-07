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
  {
    id: "network_complete",
    label: "Charging completed",
    hint: "Charge finishes on the server and syncs to the app after a network outage",
  },
];

const LS_KEY = "zunex:demo-scenario";
const SESSION_KEY_PREFIX = "zunex:session";

/**
 * Tear down every live session before a demo run so a real/previous charge
 * never lingers and holds the station "busy". We:
 *  1. gather every stored session id (zunex:session[:station]),
 *  2. ask the server to abort it (force-cancel, stop hardware) via the
 *     demo abort endpoint — keepalive so it survives the imminent reload,
 *  3. remove the local restore keys so the app boots at the welcome screen.
 */
function abortAllLiveSessions() {
  const { enabled, scenario } = useDemoStore.getState();
  const ids = new Set<string>();
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SESSION_KEY_PREFIX)) {
        const v = localStorage.getItem(key);
        if (v) ids.add(v);
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* storage unavailable */
  }

  for (const id of ids) {
    try {
      const headers: Record<string, string> = {};
      if (enabled) headers["x-zunex-demo"] = scenario;
      const token = process.env.NEXT_PUBLIC_ZUNEX_DEMO_TOKEN;
      if (enabled && token) headers["x-zunex-demo-token"] = token;
      // keepalive: fire-and-forget must complete even as the page unloads.
      fetch(`/api/sessions/${encodeURIComponent(id)}/demo/abort`, {
        method: "POST",
        headers,
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore — local teardown already cleared the restore keys */
    }
  }
}

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
    // Abort any live charging and clear restore keys BEFORE reload so the
    // fresh boot always starts the chosen scenario from the welcome screen
    // and the station is free.
    abortAllLiveSessions();
    set({ scenario, panelOpen: false });
    // Re-arm the scenario across the whole app (server reads it per request).
    window.location.reload();
  },
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setCableConnected: (cableConnected) => set({ cableConnected }),
}));

export const DEMO_SCENARIOS = SCENARIOS;
