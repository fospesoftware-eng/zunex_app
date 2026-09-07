import type {
  SessionSnapshot,
  ChargingPlan,
  SessionState,
} from "@/lib/core/types";
import { friendlyError } from "@/lib/core/types";
import { chargingHardware } from "@/lib/server/hardware";
import { paymentProvider } from "@/lib/server/payments";
import {
  FREE_PLANS,
  PLANS,
  PAYMENT_PENDING_TTL_MS,
  store,
  sweepStore,
  type SessionRecord,
} from "@/lib/server/store";

// ---------------------------------------------------------------------------
// Session service — the stateful orchestrator. Every mutation goes through
// guarded transitions so duplicate/replayed requests are safe (idempotent).
// ---------------------------------------------------------------------------

let lastSweepAt = 0;
const SWEEP_INTERVAL_MS = 60_000; // sweep at most once per minute

/** Opportunistically sweep stale sessions (throttled). */
function maybeSweep(): void {
  const now = Date.now();
  if (now - lastSweepAt < SWEEP_INTERVAL_MS) return;
  lastSweepAt = now;
  try {
    sweepStore();
  } catch {
    /* sweep must never break request handling */
  }
}

function transition(
  s: SessionRecord,
  from: SessionState[],
  to: SessionState,
  patch: Partial<SessionRecord> = {},
): boolean {
  if (!from.includes(s.state)) return false;
  s.state = to;
  s.updatedAt = Date.now();
  Object.assign(s, patch);
  return true;
}

function planOf(id: string): ChargingPlan | null {
  return PLANS.find((p) => p.id === id) ?? FREE_PLANS.find((p) => p.id === id) ?? null;
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
}

/** Lazy server tick: expire stale pending sessions, complete finished ones. */
function tick(s: SessionRecord): void {
  const now = Date.now();

  if (s.state === "payment_pending" && now - s.createdAt > PAYMENT_PENDING_TTL_MS) {
    transition(s, ["payment_pending"], "cancelled", { errorCode: "session_expired" });
    return;
  }

  // Paid but never started (e.g. client vanished) → sweep so the port frees up.
  if (
    s.state === "payment_successful" &&
    !s.startRequested &&
    now - s.updatedAt > 5 * 60_000
  ) {
    transition(s, ["payment_successful"], "cancelled", { errorCode: "session_expired" });
    return;
  }

  if (s.state === "charging_active" && s.endsAt !== null && now >= s.endsAt && !s.stopRequested) {
    s.stopRequested = true;
    transition(s, ["charging_active"], "stopping");
    const cmd = { sessionId: s.id, stationId: s.stationId, minutes: planOf(s.planId)?.minutes ?? 15 };
    chargingHardware
      .stop(cmd, "default")
      .then((res) => {
        if (res.ok) {
          transition(s, ["stopping"], "charging_completed", { completedAt: res.stoppedAt });
        } else {
          transition(s, ["stopping"], "error", { errorCode: "hardware_unreachable" });
        }
      })
      .catch(() => {
        transition(s, ["stopping"], "error", { errorCode: "hardware_unreachable" });
      });
  }
}

function toSnapshot(s: SessionRecord): SessionSnapshot {
  tick(s);
  const plan = planOf(s.planId);
  return {
    sessionId: s.id,
    stationId: s.stationId,
    state: s.state,
    plan,
    amountPaise: plan?.pricePaise ?? 0,
    payment:
      s.intentId && s.paidAt ? { intentId: s.intentId, verifiedAt: s.paidAt } : null,
    charging:
      s.startedAt && s.endsAt
        ? {
            status:
              s.state === "starting"
                ? "starting"
                : s.state === "stopping"
                  ? "stopping"
                  : s.state === "charging_active"
                    ? "active"
                    : "stopped",
            startedAt: s.startedAt,
            endsAt: s.endsAt,
            watts: s.watts ?? 30,
          }
        : null,
    errorCode: s.errorCode,
    error: friendlyError(s.errorCode),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    completedAt: s.completedAt,
    serverTime: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const sessionService = {
  getById(sessionId: string): SessionRecord | null {
    return store.sessions.get(sessionId) ?? null;
  },

  createSession(input: {
    stationId: string;
    planId: string;
    idempotencyKey?: string | null;
  }): { ok: true; session: SessionRecord } | { ok: false; code: string } {
    if (input.idempotencyKey) {
      const existingId = store.idemIndex.get(input.idempotencyKey);
      if (existingId) {
        const existing = store.sessions.get(existingId);
        if (existing && existing.stationId === input.stationId) return { ok: true, session: existing };
      }
    }
    const plan = planOf(input.planId);
    if (!plan) return { ok: false, code: "invalid_request" };
    const now = Date.now();
    // Ad-sponsored plans have nothing to collect — the ad watch (client flow)
    // is the "payment", so the session lands straight in payment_successful
    // and the existing auto-start path takes over.
    const sponsored = plan.pricePaise === 0;
    const session: SessionRecord = {
      id: newId("zs"),
      stationId: input.stationId,
      planId: input.planId,
      state: sponsored ? "payment_successful" : "payment_pending",
      intentId: null,
      createdAt: now,
      updatedAt: now,
      paidAt: sponsored ? now : null,
      startedAt: null,
      endsAt: null,
      watts: null,
      completedAt: null,
      errorCode: null,
      idempotencyKey: input.idempotencyKey ?? null,
      startRequested: false,
      stopRequested: false,
    };
    store.sessions.set(session.id, session);
    if (input.idempotencyKey) store.idemIndex.set(input.idempotencyKey, session.id);
    return { ok: true, session };
  },

  async createPaymentIntent(sessionId: string) {
    const s = store.sessions.get(sessionId);
    if (!s) return { ok: false as const, code: "session_not_found" };
    const plan = planOf(s.planId);
    if (!plan) return { ok: false as const, code: "invalid_request" };
    const intent = await paymentProvider.createIntent({
      sessionId: s.id,
      amountPaise: plan.pricePaise,
      note: `ZUNEX ${plan.minutes}min ${s.stationId}`,
    });
    s.intentId = intent.intentId;
    return { ok: true as const, intent };
  },

  async confirmPayment(sessionId: string, scenario: string) {
    const s = store.sessions.get(sessionId);
    if (!s) return { ok: false as const, code: "session_not_found" };
    if (s.state === "payment_successful") return { ok: true as const };
    if (s.state !== "payment_pending") return { ok: false as const, code: "invalid_state" };
    const intent = s.intentId ? store.intents.get(s.intentId) : undefined;
    if (!intent) return { ok: false as const, code: "invalid_request" };

    const result = await paymentProvider.verifyIntent(intent, scenario);
    if (!result.ok) return { ok: false as const, code: result.code };

    transition(s, ["payment_pending"], "payment_successful", { paidAt: Date.now() });
    return { ok: true as const };
  },

  /** DEMO ONLY — force a payment outcome from the demo panel. */
  simulatePayment(sessionId: string, outcome: "succeed" | "fail") {
    const s = store.sessions.get(sessionId);
    if (!s) return { ok: false as const, code: "session_not_found" };
    if (s.state !== "payment_pending") return { ok: false as const, code: "invalid_state" };
    if (outcome === "succeed") {
      transition(s, ["payment_pending"], "payment_successful", { paidAt: Date.now() });
    } else {
      transition(s, ["payment_pending"], "error", { errorCode: "payment_failed" });
    }
    return { ok: true as const };
  },

  /** Payment verified → request hardware start → station confirms → active. */
  requestStart(sessionId: string, scenario: string, isRetry = false) {
    const s = store.sessions.get(sessionId);
    if (!s) return { ok: false as const, code: "session_not_found" };
    if (s.state === "starting" || s.state === "charging_active") return { ok: true as const };
    if (s.state === "error" && s.errorCode === "hardware_start_failed" && isRetry) {
      s.startRequested = false;
    } else if (!isRetry) {
      if (s.state !== "payment_successful") return { ok: false as const, code: "invalid_state" };
    } else {
      return { ok: false as const, code: "invalid_state" };
    }
    if (s.startRequested) return { ok: true as const };
    s.startRequested = true;

    const plan = planOf(s.planId);
    transition(s, ["payment_successful", "error"], "starting", { errorCode: null });

    const cmd = { sessionId: s.id, stationId: s.stationId, minutes: plan?.minutes ?? 15 };
    chargingHardware
      .start(cmd, scenario)
      .then((res) => {
        if (res.ok) {
          transition(s, ["starting"], "charging_active", {
            startedAt: res.startedAt,
            endsAt: res.endsAt,
            watts: res.watts,
          });
        } else {
          transition(s, ["starting"], "error", { errorCode: res.code, startRequested: false });
        }
      })
      .catch(() => {
        transition(s, ["starting"], "error", {
          errorCode: "hardware_unreachable",
          startRequested: false,
        });
      });

    return { ok: true as const };
  },

  cancel(sessionId: string): { ok: boolean; code?: string } {
    const s = store.sessions.get(sessionId);
    if (!s) return { ok: false, code: "session_not_found" };
    const done = transition(
      s,
      ["payment_pending", "error"],
      "cancelled",
      { errorCode: s.state === "error" ? s.errorCode : "cancelled" },
    );
    return done ? { ok: true } : { ok: false, code: "invalid_state" };
  },

  snapshot(sessionId: string): SessionSnapshot | null {
    maybeSweep();
    const s = store.sessions.get(sessionId);
    if (!s) return null;
    return toSnapshot(s);
  },

  /** Demo-only: collapse the remaining time so completion can be shown. */
  collapseToEnd(sessionId: string): SessionSnapshot | null {
    const s = store.sessions.get(sessionId);
    if (!s) return null;
    if (s.state === "charging_active" && s.endsAt) {
      s.endsAt = Date.now() + 4000;
      s.updatedAt = Date.now();
    }
    return toSnapshot(s);
  },

  /**
   * DEMO ONLY — forcibly tear down ANY session (including a live charging
   * one) so the station frees up and a fresh demo run can begin. Cancels
   * pending/paid sessions, stops hardware for active/starting/stopping ones.
   * Idempotent: terminating an already-terminal session is harmless.
   */
  abortForDemo(sessionId: string): boolean {
    const s = store.sessions.get(sessionId);
    if (!s) return false;

    const live: SessionState[] = ["starting", "charging_active", "stopping"];
    if (live.includes(s.state)) {
      const cmd = {
        sessionId: s.id,
        stationId: s.stationId,
        minutes: planOf(s.planId)?.minutes ?? 15,
      };
      // Best-effort hardware stop — never block teardown on the ack.
      void chargingHardware
        .stop(cmd, "default")
        .catch(() => {
          /* mock/no hardware — nothing to release */
        });
    }

    if (
      s.state !== "cancelled" &&
      s.state !== "charging_completed" &&
      s.state !== "error"
    ) {
      s.state = "cancelled";
    }
    s.stopRequested = true;
    s.startRequested = false;
    s.updatedAt = Date.now();
    return true;
  },
};
