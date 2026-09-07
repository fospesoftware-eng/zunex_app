"use client";

import { create } from "zustand";
import type { DemoScenario } from "@/lib/core/types";
import { api } from "@/lib/client/api";

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
 * Clear all session restore keys from localStorage so the app boots fresh.
 * Does NOT touch the server — that's the caller's job (or use abortAllLiveSessions).
 */
function clearLocalSessionKeys(): void {
  try {
    const toRemove: string[] = [];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SESSION_KEY_PREFIX)) toRemove.push(key);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    /* storage unavailable */
  }
}

/**
 * DEMO ONLY — abort EVERY session on the server (incl. live charging) and
 * clear local restore keys so a fresh demo run always starts clean. Fires
 * the server request with keepalive so it lands even if the page unloads.
 */
export function abortAllLiveSessions(): void {
  const { enabled } = useDemoStore.getState();

  // 1. Server-side: abort EVERY session across all stations — catches
  //    orphans from other tabs / crashed clients that localStorage never
  //    knew about. keepalive guarantees it lands even during a reload.
  if (enabled) {
    try {
      api.demoAbortAll().catch(() => {
        /* fire-and-forget — server teardown is best-effort */
      });
    } catch {
      /* ignore — local teardown still happens below */
    }
  }

  // 2. Clear local restore keys so the app boots at the welcome screen.
  clearLocalSessionKeys();
}

/**
 * Fire-and-forget server-side abort only — no local state change, no reload.
 * Used when the user just opens the demo panel to peek; we still want to
 * clear any lingering charges so the station isn't "busy".
 */
export function abortServerSessions(): void {
  const { enabled } = useDemoStore.getState();
  if (!enabled) return;
  try {
    api.demoAbortAll().catch(() => {});
  } catch {
    /* ignore */
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
