import type { ChargingPlan, SessionState } from "@/lib/core/types";

// ---------------------------------------------------------------------------
// In-memory persistence for the MVP. Swap this module for a real database
// adapter (Postgres/Redis) without touching services — everything talks to
// the Store interface below, keyed by id, living on globalThis so hot reloads
// in development keep state.
// ---------------------------------------------------------------------------

export interface SessionRecord {
  id: string;
  stationId: string;
  planId: string;
  state: SessionState;
  intentId: string | null;
  createdAt: number;
  updatedAt: number;
  paidAt: number | null;
  startedAt: number | null;
  endsAt: number | null;
  watts: number | null;
  completedAt: number | null;
  errorCode: string | null;
  idempotencyKey: string | null;
  /** transient flag so hardware.start is only awaited once */
  startRequested: boolean;
  /** transient flag so stop is only requested once */
  stopRequested: boolean;
}

export interface IntentRecord {
  id: string;
  sessionId: string;
  amountPaise: number;
  upiRef: string;
  status: "created" | "verified" | "failed";
  createdAt: number;
}

interface ZunexStore {
  sessions: Map<string, SessionRecord>;
  intents: Map<string, IntentRecord>;
  idemIndex: Map<string, string>; // idempotencyKey -> sessionId
  lastVerifyAttempt: Map<string, number>; // sessionId -> ts (mock PSP latency shaping)
}

const g = globalThis as unknown as { __zunexStore?: ZunexStore };

export const store: ZunexStore =
  g.__zunexStore ??
  (g.__zunexStore = {
    sessions: new Map(),
    intents: new Map(),
    idemIndex: new Map(),
    lastVerifyAttempt: new Map(),
  });

// ---------------------------------------------------------------------------
// Plans — configured server-side; durations/pricing can move to a DB or CMS
// later without any UI change.
// ---------------------------------------------------------------------------

export const PLANS: ChargingPlan[] = [
  { id: "p15", minutes: 15, pricePaise: 2000, label: "Quick", tagline: "A fast top-up" },
  { id: "p30", minutes: 30, pricePaise: 3500, label: "Standard", tagline: "The everyday boost" },
  { id: "p60", minutes: 60, pricePaise: 6000, label: "Full", tagline: "Maximum charge" },
];

// Ad-sponsored plans — earned by watching an ad, never listed on the station
// board. Sessions created on these skip payment entirely.
export const FREE_PLANS: ChargingPlan[] = [
  { id: "free5", minutes: 5, pricePaise: 0, label: "Free top-up", tagline: "30s ad · 5 min free" },
  { id: "free10", minutes: 10, pricePaise: 0, label: "Free boost", tagline: "60s ad · 10 min free" },
];

export const PAYMENT_PENDING_TTL_MS = 15 * 60 * 1000;

/**
 * Sessions that are terminal (cancelled, completed, error) or long-finished
 * are swept after this window so the in-memory store doesn't grow without
 * bound under abuse.
 */
export const SESSION_RETENTION_MS = 2 * 60 * 60 * 1000; // 2 hours
export const MAX_SESSIONS = 5000; // hard cap — evict oldest terminal first

/**
 * Sweep stale sessions and intents to bound memory. Called opportunistically
 * from session reads so it doesn't need its own timer.
 */
export function sweepStore(): void {
  const now = Date.now();
  const terminalStates = new Set(["cancelled", "charging_completed", "error"]);

  for (const [id, s] of store.sessions) {
    const age = now - s.updatedAt;
    if (terminalStates.has(s.state) && age > SESSION_RETENTION_MS) {
      store.sessions.delete(id);
      if (s.idempotencyKey) store.idemIndex.delete(s.idempotencyKey);
      if (s.intentId) store.intents.delete(s.intentId);
      continue;
    }
    // Anything stale past the retention window (e.g. abandoned active sessions
    // from crashed clients) is also dropped.
    if (age > SESSION_RETENTION_MS && !["starting", "charging_active", "stopping"].includes(s.state)) {
      store.sessions.delete(id);
      if (s.idempotencyKey) store.idemIndex.delete(s.idempotencyKey);
      if (s.intentId) store.intents.delete(s.intentId);
    }
  }

  // Hard cap: if still over the limit, drop oldest terminal sessions.
  if (store.sessions.size > MAX_SESSIONS) {
    const sorted = [...store.sessions.entries()]
      .filter(([, s]) => terminalStates.has(s.state))
      .sort((a, b) => a[1].updatedAt - b[1].updatedAt);
    const toRemove = store.sessions.size - MAX_SESSIONS;
    for (let i = 0; i < Math.min(toRemove, sorted.length); i++) {
      const [id, s] = sorted[i];
      store.sessions.delete(id);
      if (s.idempotencyKey) store.idemIndex.delete(s.idempotencyKey);
      if (s.intentId) store.intents.delete(s.intentId);
    }
  }

  // Sweep orphaned intents older than the retention window.
  for (const [id, intent] of store.intents) {
    if (now - intent.createdAt > SESSION_RETENTION_MS) store.intents.delete(id);
  }
}
